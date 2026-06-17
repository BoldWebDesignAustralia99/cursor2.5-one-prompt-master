-- ============================================================================
-- The spine, part 1: activities (audit/event stream) + communications.
-- Architecture 01 §2: ONE event stream and ONE interaction table. Every timeline
-- in the app is one indexed, paginated query here. Links are polymorphic
-- (entity_kind + entity_id) so the spine does not depend on table creation order.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- activities — system events; powers timelines AND is the audit log (§7).
-- ---------------------------------------------------------------------------
create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  occurred_at   timestamptz not null default now(),
  actor_id      uuid references public.profiles (id) on delete set null,
  actor_label   text,                       -- e.g. 'System', 'Workflow: Low balance'
  verb          text not null,              -- 'stage_changed' | 'payment_taken' | ...
  entity_kind   entity_kind not null,
  entity_id     uuid not null,
  summary       text not null,
  metadata      jsonb not null default '{}'::jsonb,
  is_audit      boolean not null default true,
  region        region
);

create index activities_entity_idx on public.activities (entity_kind, entity_id, occurred_at desc);
create index activities_actor_idx  on public.activities (actor_id, occurred_at desc);
create index activities_verb_idx   on public.activities (verb, occurred_at desc);

-- Helper used across the codebase to append to the audit/event stream.
create or replace function public.log_activity(
  p_entity_kind entity_kind,
  p_entity_id   uuid,
  p_verb        text,
  p_summary     text,
  p_metadata    jsonb default '{}'::jsonb,
  p_actor       uuid default auth.uid()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.activities (actor_id, verb, entity_kind, entity_id, summary, metadata)
  values (p_actor, p_verb, p_entity_kind, p_entity_id, p_summary, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- communications — ONE table for every human interaction.
-- ---------------------------------------------------------------------------
create table public.communications (
  id              uuid primary key default gen_random_uuid(),
  channel         comm_channel not null,
  direction       comm_direction not null,
  status          comm_status not null default 'completed',
  occurred_at     timestamptz not null default now(),

  -- Primary polymorphic link (the record whose timeline this belongs to).
  entity_kind     entity_kind not null,
  entity_id       uuid not null,
  -- Optional secondary link (e.g. a patient SMS also tied to a booking/clinic).
  secondary_kind  entity_kind,
  secondary_id    uuid,

  author_id       uuid references public.profiles (id) on delete set null,
  from_address    text,                     -- phone/email/handle
  to_address      text,
  subject         text,
  body            text,

  duration_seconds int,                     -- calls
  media           jsonb not null default '{}'::jsonb,  -- recording_url, transcript_id, attachments[]
  external_id     text,                     -- Twilio/Resend provider id
  template_key    text,                     -- which template fired (per-stage SMS, etc.)
  metadata        jsonb not null default '{}'::jsonb,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger trg_comms_updated before update on public.communications
  for each row execute function public.set_updated_at();

create index comms_entity_idx     on public.communications (entity_kind, entity_id, occurred_at desc);
create index comms_secondary_idx  on public.communications (secondary_kind, secondary_id, occurred_at desc)
  where secondary_id is not null;
create index comms_channel_idx    on public.communications (channel, occurred_at desc);
create index comms_author_idx     on public.communications (author_id, occurred_at desc);
create index comms_external_idx   on public.communications (external_id) where external_id is not null;
create index comms_body_trgm      on public.communications using gin (body gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- RLS — visibility is decided by the linked entity's domain policies, surfaced
-- through permission keys. Clinic-side users only ever see comms for entities
-- in their clinic (enforced in feature migrations via the `comms.view_*` keys
-- and clinic-scope helpers). Baseline: must be authenticated and hold a
-- comms-view permission OR be the author.
-- ---------------------------------------------------------------------------
alter table public.activities      enable row level security;
alter table public.communications  enable row level security;

create policy activities_read on public.activities
  for select to authenticated
  using (public.authorize('activities.view') or actor_id = auth.uid());
create policy activities_insert on public.activities
  for insert to authenticated
  with check (public.authorize('activities.write') or actor_id = auth.uid());

create policy comms_read on public.communications
  for select to authenticated
  using (public.authorize('comms.view') or author_id = auth.uid());
create policy comms_write on public.communications
  for insert to authenticated
  with check (public.authorize('comms.send') or author_id = auth.uid());
create policy comms_update on public.communications
  for update to authenticated
  using (public.authorize('comms.send') or author_id = auth.uid())
  with check (public.authorize('comms.send') or author_id = auth.uid());
