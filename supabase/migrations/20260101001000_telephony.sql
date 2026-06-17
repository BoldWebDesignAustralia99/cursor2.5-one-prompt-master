-- ============================================================================
-- Telephony + realtime transcription (Feature 9.5). Softphone call sessions,
-- recordings/voicemail, two-way SMS templates, per-country numbers, forwarding
-- rule groups, and Deepgram live transcripts. Used by booking AND follow-up reps.
-- ============================================================================

create type call_session_status as enum (
  'initiated', 'ringing', 'in_progress', 'on_hold',
  'completed', 'no_answer', 'busy', 'failed', 'voicemail'
);

create table public.phone_numbers (
  id           uuid primary key default gen_random_uuid(),
  region       region not null,
  e164         text not null unique,
  label        text,
  provider_ref text,                              -- Twilio number SID
  clinic_id    uuid references public.clinics (id) on delete set null,
  capabilities jsonb not null default '{"voice":true,"sms":true}'::jsonb,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);
create index phone_numbers_region_idx on public.phone_numbers (region) where is_active;

create table public.call_sessions (
  id              uuid primary key default gen_random_uuid(),
  communication_id uuid references public.communications (id) on delete set null,
  lead_id         uuid references public.leads (id) on delete set null,
  clinic_id       uuid references public.clinics (id) on delete set null,
  booking_id      uuid references public.bookings (id) on delete set null,
  rep_id          uuid references public.profiles (id) on delete set null,
  direction       comm_direction not null default 'outbound',
  from_number     text,
  to_number       text,
  status          call_session_status not null default 'initiated',
  twilio_call_sid text,
  started_at      timestamptz not null default now(),
  answered_at     timestamptz,
  ended_at        timestamptz,
  duration_seconds int,
  recording_url   text,
  voicemail_url   text,
  is_muted        boolean not null default false,
  is_on_hold      boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  updated_at      timestamptz not null default now()
);
create index call_sessions_rep_idx    on public.call_sessions (rep_id, started_at desc);
create index call_sessions_lead_idx   on public.call_sessions (lead_id, started_at desc);
create index call_sessions_status_idx on public.call_sessions (status) where status in ('initiated','ringing','in_progress','on_hold');
create index call_sessions_sid_idx    on public.call_sessions (twilio_call_sid);
create trigger trg_call_sessions_updated before update on public.call_sessions
  for each row execute function public.set_updated_at();

-- Live + final transcripts (Twilio Media Streams → Deepgram).
create table public.call_transcripts (
  id              uuid primary key default gen_random_uuid(),
  call_session_id uuid not null references public.call_sessions (id) on delete cascade,
  communication_id uuid references public.communications (id) on delete set null,
  provider        text not null default 'deepgram',
  is_final        boolean not null default false,
  full_text       text not null default '',
  segments        jsonb not null default '[]'::jsonb,   -- [{speaker, ts, text}]
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index call_transcripts_session_idx on public.call_transcripts (call_session_id);
create trigger trg_transcripts_updated before update on public.call_transcripts
  for each row execute function public.set_updated_at();

-- Shared SMS/email templates (per-stage SMS, workflow actions, campaigns).
create table public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  channel    comm_channel not null,
  category   text,                                -- 'call_flow' | 'reminder' | 'nurture' ...
  subject    text,
  body       text not null,
  variables  jsonb not null default '[]'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_templates_updated before update on public.message_templates
  for each row execute function public.set_updated_at();

-- Forwarding rules (filter rule groups → routing target), per number.
create table public.forwarding_rules (
  id              uuid primary key default gen_random_uuid(),
  phone_number_id uuid not null references public.phone_numbers (id) on delete cascade,
  rule_group_id   uuid references public.rule_groups (id) on delete set null,
  target          text not null,                  -- e164 / sip / voicemail
  priority        int not null default 100,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index forwarding_rules_number_idx on public.forwarding_rules (phone_number_id, priority);

alter table public.phone_numbers     enable row level security;
alter table public.call_sessions     enable row level security;
alter table public.call_transcripts  enable row level security;
alter table public.message_templates enable row level security;
alter table public.forwarding_rules  enable row level security;

create policy phone_numbers_read on public.phone_numbers
  for select to authenticated using (public.authorize('telephony.use') or public.authorize('telephony.manage'));
create policy phone_numbers_manage on public.phone_numbers
  for all to authenticated
  using (public.authorize('telephony.manage')) with check (public.authorize('telephony.manage'));

create policy call_sessions_read on public.call_sessions
  for select to authenticated
  using (rep_id = auth.uid() or public.authorize('calls.monitor'));
create policy call_sessions_write on public.call_sessions
  for all to authenticated
  using (rep_id = auth.uid() or public.authorize('telephony.manage'))
  with check (rep_id = auth.uid() or public.authorize('telephony.manage'));

create policy transcripts_read on public.call_transcripts
  for select to authenticated
  using (
    public.authorize('calls.monitor')
    or exists (select 1 from public.call_sessions cs where cs.id = call_session_id and cs.rep_id = auth.uid())
  );
create policy transcripts_write on public.call_transcripts
  for all to authenticated
  using (public.authorize('telephony.use')) with check (public.authorize('telephony.use'));

create policy templates_read on public.message_templates
  for select to authenticated using (true);
create policy templates_manage on public.message_templates
  for all to authenticated
  using (public.authorize('templates.manage')) with check (public.authorize('templates.manage'));

create policy forwarding_read on public.forwarding_rules
  for select to authenticated using (public.authorize('telephony.manage'));
create policy forwarding_manage on public.forwarding_rules
  for all to authenticated
  using (public.authorize('telephony.manage')) with check (public.authorize('telephony.manage'));
