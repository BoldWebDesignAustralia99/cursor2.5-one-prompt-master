-- ============================================================================
-- Settings framework + feature flags + integration health + system logs, and
-- the follow-up sales specifics (treatment plans + clinic-attributed outcomes).
-- Architecture 01 §5: anything an admin might change is a SETTING; §7 observability.
-- ============================================================================

-- The single key/value business-rules store (billable map lives in its own table;
-- everything else — finance thresholds, deposit rules, cadence, refund rules,
-- low-balance thresholds, notification routing defaults, URLs — lives here).
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  category    text not null default 'general',
  description text,
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now()
);

create table public.feature_flags (
  key         text primary key,
  name        text not null,
  description text,
  is_enabled  boolean not null default false,
  rollout     jsonb not null default '{}'::jsonb,    -- {user_ids:[], percentage:n}
  updated_by  uuid references public.profiles (id),
  updated_at  timestamptz not null default now()
);

create type integration_status as enum ('ok', 'degraded', 'down', 'unknown');

create table public.integrations (
  key            text primary key,          -- 'twilio' | 'stripe' | 'gocardless' | 'resend' | 'pms'
  name           text not null,
  status         integration_status not null default 'unknown',
  last_checked_at timestamptz,
  detail         jsonb not null default '{}'::jsonb,
  updated_at     timestamptz not null default now()
);
create trigger trg_integrations_updated before update on public.integrations
  for each row execute function public.set_updated_at();

create type log_level as enum ('debug', 'info', 'warn', 'error');

create table public.system_logs (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,                 -- edge function / cron job / integration
  level      log_level not null default 'info',
  message    text not null,
  context    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index system_logs_source_idx on public.system_logs (source, created_at desc);
create index system_logs_level_idx  on public.system_logs (level, created_at desc);

-- ---------------------------------------------------------------------------
-- Follow-up sales (persona 08). Linked-but-separate from the booking pipeline;
-- the generic pipeline engine handles the board, these tables hold the specifics.
-- ---------------------------------------------------------------------------
create table public.treatment_plans (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references public.leads (id) on delete cascade,
  booking_id        uuid references public.bookings (id) on delete set null,
  clinic_id         uuid references public.clinics (id) on delete set null,
  summary           text,
  quoted_value_cents bigint not null default 0,
  currency          text not null default 'AUD',
  received_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index treatment_plans_lead_idx on public.treatment_plans (lead_id);
create trigger trg_treatment_plans_updated before update on public.treatment_plans
  for each row execute function public.set_updated_at();

create type follow_up_result as enum ('won', 'lost');

create table public.follow_up_outcomes (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.leads (id) on delete cascade,
  pipeline_item_id    uuid references public.pipeline_items (id) on delete set null,
  clinic_id           uuid references public.clinics (id) on delete set null,
  rep_id              uuid references public.profiles (id) on delete set null,
  result              follow_up_result not null,
  treatment_value_cents bigint not null default 0,
  fee_cents           bigint not null default 0,         -- commission to Dental Group
  currency            text not null default 'AUD',
  reason              text,
  attributed_at       timestamptz not null default now(),
  created_at          timestamptz not null default now()
);
create index follow_up_outcomes_clinic_idx on public.follow_up_outcomes (clinic_id, attributed_at desc);
create index follow_up_outcomes_rep_idx     on public.follow_up_outcomes (rep_id, attributed_at desc);

alter table public.settings           enable row level security;
alter table public.feature_flags      enable row level security;
alter table public.integrations       enable row level security;
alter table public.system_logs        enable row level security;
alter table public.treatment_plans    enable row level security;
alter table public.follow_up_outcomes enable row level security;

-- Settings: readable by authenticated (the UI needs business rules to render);
-- writable only by settings managers.
create policy settings_read on public.settings
  for select to authenticated using (true);
create policy settings_manage on public.settings
  for all to authenticated using (public.authorize('settings.manage')) with check (public.authorize('settings.manage'));

create policy flags_read on public.feature_flags
  for select to authenticated using (true);
create policy flags_manage on public.feature_flags
  for all to authenticated using (public.authorize('flags.manage')) with check (public.authorize('flags.manage'));

create policy integrations_read on public.integrations
  for select to authenticated using (public.authorize('system.view'));
create policy integrations_manage on public.integrations
  for all to authenticated using (public.authorize('system.manage')) with check (public.authorize('system.manage'));

create policy system_logs_read on public.system_logs
  for select to authenticated using (public.authorize('system.view'));
create policy system_logs_write on public.system_logs
  for insert to authenticated with check (public.authorize('system.manage'));

create policy treatment_plans_read on public.treatment_plans
  for select to authenticated
  using (public.authorize('followup.view') or (clinic_id is not null and public.is_clinic_member(clinic_id)));
create policy treatment_plans_write on public.treatment_plans
  for all to authenticated using (public.authorize('followup.manage')) with check (public.authorize('followup.manage'));

create policy follow_up_outcomes_read on public.follow_up_outcomes
  for select to authenticated
  using (rep_id = auth.uid() or public.authorize('followup.view')
         or (clinic_id is not null and public.is_clinic_admin(clinic_id)));
create policy follow_up_outcomes_write on public.follow_up_outcomes
  for all to authenticated
  using (rep_id = auth.uid() or public.authorize('followup.manage'))
  with check (rep_id = auth.uid() or public.authorize('followup.manage'));
