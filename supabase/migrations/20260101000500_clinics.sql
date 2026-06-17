-- ============================================================================
-- Clinics + clinic membership + practitioners.
-- Lifecycle-driven single row per clinic (Architecture 01 §2). Clinic-side users
-- are RLS-scoped to the clinic(s) they belong to — structurally (§4).
-- ============================================================================

create type clinic_lifecycle_stage as enum (
  'prospect', 'proposal_sent', 'signed', 'onboarding', 'active', 'paused', 'churned'
);

create type senior_status as enum ('on_site', 'visiting', 'none');

create type clinic_member_role as enum ('clinic_admin', 'clinic_staff');

create table public.clinics (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  slug                 text unique,
  region               region not null default 'AU',
  timezone             text not null default 'Australia/Brisbane',
  lifecycle_stage      clinic_lifecycle_stage not null default 'prospect',
  address_line         text,
  suburb               text,
  state                text,
  postcode             text,
  country              text,
  latitude             double precision,
  longitude            double precision,
  phone                text,
  email                text,
  outbound_caller_id   text,                 -- per-clinic outbound caller ID (9.5)
  pms_provider         text,
  pms_active           boolean not null default false,
  -- Cached money figures maintained by the credit ledger triggers (source: ledger).
  credit_balance       integer not null default 0,
  low_balance_threshold integer not null default 5,
  is_paused_for_routing boolean not null default false,  -- zero credits ⇒ paused (9.8)
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index clinics_lifecycle_idx on public.clinics (lifecycle_stage);
create index clinics_region_idx    on public.clinics (region);
create index clinics_geo_idx       on public.clinics (latitude, longitude);
create trigger trg_clinics_updated before update on public.clinics
  for each row execute function public.set_updated_at();

-- Which internal/clinic users belong to which clinic (one login → many clinics).
create table public.clinic_members (
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  member_role clinic_member_role not null default 'clinic_staff',
  created_at  timestamptz not null default now(),
  primary key (clinic_id, user_id)
);
create index clinic_members_user_idx on public.clinic_members (user_id);

-- Practitioners (dentists) bookable at a clinic; senior status drives rep badges.
create table public.clinic_practitioners (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  full_name     text not null,
  senior        senior_status not null default 'none',
  is_active     boolean not null default true,
  profile_id    uuid references public.profiles (id),  -- optional login link
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index clinic_practitioners_clinic_idx on public.clinic_practitioners (clinic_id) where is_active;
create trigger trg_practitioners_updated before update on public.clinic_practitioners
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Clinic-scope helpers (used by every clinic-scoped RLS policy).
-- ---------------------------------------------------------------------------
create or replace function public.user_clinic_ids(p_user uuid default auth.uid())
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select clinic_id from public.clinic_members where user_id = p_user;
$$;

create or replace function public.is_clinic_member(p_clinic uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = p_clinic and user_id = p_user
  );
$$;

create or replace function public.is_clinic_admin(p_clinic uuid, p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = p_clinic and user_id = p_user and member_role = 'clinic_admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS — internal staff with the clinics.* keys see all; clinic users only theirs.
-- ---------------------------------------------------------------------------
alter table public.clinics              enable row level security;
alter table public.clinic_members       enable row level security;
alter table public.clinic_practitioners enable row level security;

create policy clinics_read on public.clinics
  for select to authenticated
  using (public.authorize('clinics.view') or public.is_clinic_member(id));
create policy clinics_admin_manage on public.clinics
  for all to authenticated
  using (public.authorize('clinics.manage')) with check (public.authorize('clinics.manage'));
-- Clinic admins may edit their own clinic's mutable fields (calendars/profile);
-- billing-sensitive columns are guarded at the service/function layer.
create policy clinics_member_update on public.clinics
  for update to authenticated
  using (public.is_clinic_admin(id)) with check (public.is_clinic_admin(id));

create policy clinic_members_read on public.clinic_members
  for select to authenticated
  using (user_id = auth.uid() or public.authorize('clinics.view') or public.is_clinic_admin(clinic_id));
create policy clinic_members_manage on public.clinic_members
  for all to authenticated
  using (public.authorize('clinics.manage') or public.is_clinic_admin(clinic_id))
  with check (public.authorize('clinics.manage') or public.is_clinic_admin(clinic_id));

create policy practitioners_read on public.clinic_practitioners
  for select to authenticated
  using (public.authorize('clinics.view') or public.is_clinic_member(clinic_id));
create policy practitioners_manage on public.clinic_practitioners
  for all to authenticated
  using (public.authorize('clinics.manage') or public.is_clinic_admin(clinic_id))
  with check (public.authorize('clinics.manage') or public.is_clinic_admin(clinic_id));
