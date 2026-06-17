-- ============================================================================
-- Leads / patients (one lifecycle-driven row) + sources + routing matrix (9.6).
-- A lead and a patient are the SAME row at different stages — "converting" is a
-- stage change, never a copy into a second table (Architecture 01 §2).
-- ============================================================================

create type lead_source_kind as enum ('facebook', 'make', 'csv', 'manual', 'referral', 'recovery');

create type lead_status as enum (
  'new', 'in_progress', 'callback_scheduled', 'no_answer',
  'booked', 'attended', 'not_interested', 'not_eligible',
  'nurture', 'converted', 'lost'
);

create table public.lead_sources (
  id         uuid primary key default gen_random_uuid(),
  key        text not null unique,
  name       text not null,
  kind       lead_source_kind not null,
  is_active  boolean not null default true,
  config     jsonb not null default '{}'::jsonb,   -- webhook ids, field mapping, etc.
  created_at timestamptz not null default now()
);

create table public.leads (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null default '',
  phone             text,
  email             text,
  suburb            text,
  state             text,
  postcode          text,
  region            region not null default 'AU',
  latitude          double precision,
  longitude         double precision,

  source_id         uuid references public.lead_sources (id),
  status            lead_status not null default 'new',
  enquiry_type      text,                          -- drives the auto-selected call flow
  assigned_to       uuid references public.profiles (id) on delete set null,
  assigned_clinic_id uuid references public.clinics (id) on delete set null,

  -- Queue/cadence fields (Feature 9.7).
  cadence_step      int not null default 0,
  next_callback_at  timestamptz,
  last_contacted_at timestamptz,
  attempts          int not null default 0,

  -- Compliance state that must persist across modals (persona 04).
  pricing_provided      boolean not null default false,
  pricing_provided_at   timestamptz,
  finance_eligible      boolean,
  finance_checked_at    timestamptz,
  broker_referral_at    timestamptz,

  dedupe_key        text,                          -- normalised phone/email for dedupe
  checklist         jsonb not null default '[]'::jsonb,
  notes             text,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create unique index leads_dedupe_idx on public.leads (dedupe_key) where dedupe_key is not null;
create index leads_status_idx        on public.leads (status, next_callback_at);
create index leads_assigned_idx      on public.leads (assigned_to, status);
create index leads_clinic_idx        on public.leads (assigned_clinic_id);
create index leads_name_trgm         on public.leads using gin (full_name gin_trgm_ops);
create index leads_phone_idx         on public.leads (phone);
create trigger trg_leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

-- Assignment history (audit + reassignment jobs).
create table public.lead_assignments (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references public.leads (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  assigned_by uuid references public.profiles (id) on delete set null,
  reason      text,
  assigned_at timestamptz not null default now()
);
create index lead_assignments_lead_idx on public.lead_assignments (lead_id, assigned_at desc);

-- ---------------------------------------------------------------------------
-- Routing matrix: geographic zones → clinics with weights/caps + period counters.
-- ---------------------------------------------------------------------------
create table public.zones (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  region     region not null default 'AU',
  -- Match definition: { "postcodes": [...], "polygon": {geojson}, "radius_km": n, "center": [lng,lat] }
  match      jsonb not null default '{}'::jsonb,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create type cap_period as enum ('day', 'week', 'month', 'none');

create table public.zone_clinics (
  id              uuid primary key default gen_random_uuid(),
  zone_id         uuid not null references public.zones (id) on delete cascade,
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  weight          numeric not null default 1,
  cap_period      cap_period not null default 'none',
  cap_limit       int,
  period_count    int not null default 0,
  period_started_at timestamptz not null default now(),
  is_active       boolean not null default true,
  unique (zone_id, clinic_id)
);
create index zone_clinics_zone_idx   on public.zone_clinics (zone_id);
create index zone_clinics_clinic_idx on public.zone_clinics (clinic_id);

alter table public.lead_sources     enable row level security;
alter table public.leads            enable row level security;
alter table public.lead_assignments enable row level security;
alter table public.zones            enable row level security;
alter table public.zone_clinics     enable row level security;

create policy lead_sources_read on public.lead_sources
  for select to authenticated using (public.authorize('leads.view') or public.authorize('marketing.view'));
create policy lead_sources_manage on public.lead_sources
  for all to authenticated
  using (public.authorize('marketing.manage')) with check (public.authorize('marketing.manage'));

-- Reps see their assigned leads; viewers/managers see all; no clinic-side access.
create policy leads_read on public.leads
  for select to authenticated
  using (assigned_to = auth.uid() or public.authorize('leads.view'));
create policy leads_write on public.leads
  for all to authenticated
  using (assigned_to = auth.uid() or public.authorize('leads.manage'))
  with check (assigned_to = auth.uid() or public.authorize('leads.manage'));

create policy lead_assignments_read on public.lead_assignments
  for select to authenticated using (public.authorize('leads.view'));
create policy lead_assignments_write on public.lead_assignments
  for insert to authenticated with check (public.authorize('leads.manage'));

create policy zones_read on public.zones
  for select to authenticated using (public.authorize('leads.view') or public.authorize('marketing.view'));
create policy zones_manage on public.zones
  for all to authenticated
  using (public.authorize('routing.manage')) with check (public.authorize('routing.manage'));

create policy zone_clinics_read on public.zone_clinics
  for select to authenticated using (public.authorize('leads.view') or public.authorize('marketing.view'));
create policy zone_clinics_manage on public.zone_clinics
  for all to authenticated
  using (public.authorize('routing.manage')) with check (public.authorize('routing.manage'));
