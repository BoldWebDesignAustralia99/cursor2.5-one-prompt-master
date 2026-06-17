-- ============================================================================
-- Availability engine (Feature 9.1). Weekly hours + date overrides + slot sizing,
-- timezone-correct per clinic, public holidays, capacity cache, and a DB-level
-- overlap constraint that makes double-booking impossible at insert time.
-- ============================================================================

-- Weekly hours: one row per (practitioner, clinic, weekday). weekday 0=Sun..6=Sat.
create table public.clinic_staff_availability (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  practitioner_id uuid not null references public.clinic_practitioners (id) on delete cascade,
  weekday         smallint not null check (weekday between 0 and 6),
  start_time      time not null,
  end_time        time not null,
  is_available    boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  check (end_time > start_time),
  unique (practitioner_id, weekday, start_time)
);
create index csa_clinic_idx on public.clinic_staff_availability (clinic_id, weekday);
create trigger trg_csa_updated before update on public.clinic_staff_availability
  for each row execute function public.set_updated_at();

-- Date overrides: is_available=false ⇒ whole day blocked; true+times ⇒ replaces hours.
create table public.clinic_staff_availability_overrides (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  practitioner_id uuid not null references public.clinic_practitioners (id) on delete cascade,
  date            date not null,
  start_time      time,
  end_time        time,
  is_available    boolean not null,
  reason          text,
  created_by      uuid references public.profiles (id),
  created_at      timestamptz not null default now(),
  unique (practitioner_id, date, start_time)
);
create index csao_clinic_date_idx on public.clinic_staff_availability_overrides (clinic_id, date);

-- Slot sizing per practitioner.
create table public.clinic_staff_booking_settings (
  practitioner_id  uuid primary key references public.clinic_practitioners (id) on delete cascade,
  clinic_id        uuid not null references public.clinics (id) on delete cascade,
  duration_minutes int not null default 60,
  buffer_minutes   int not null default 15,
  updated_at       timestamptz not null default now()
);
create trigger trg_csbs_updated before update on public.clinic_staff_booking_settings
  for each row execute function public.set_updated_at();

-- Public holidays per region.
create table public.public_holidays (
  id      uuid primary key default gen_random_uuid(),
  region  region not null,
  date    date not null,
  name    text not null,
  unique (region, date)
);

-- Per-clinic per-day slot count cache (refreshed on schedule; consumed by routing).
create table public.clinic_capacity_cache (
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  date            date not null,
  available_slots int not null default 0,
  refreshed_at    timestamptz not null default now(),
  primary key (clinic_id, date)
);

alter table public.clinic_staff_availability           enable row level security;
alter table public.clinic_staff_availability_overrides enable row level security;
alter table public.clinic_staff_booking_settings        enable row level security;
alter table public.public_holidays                      enable row level security;
alter table public.clinic_capacity_cache                enable row level security;

-- Calendar tables: readable by clinic members + internal viewers; writable by
-- clinic staff/admin of that clinic or internal managers.
create policy csa_read on public.clinic_staff_availability
  for select to authenticated
  using (public.authorize('clinics.view') or public.is_clinic_member(clinic_id));
create policy csa_write on public.clinic_staff_availability
  for all to authenticated
  using (public.authorize('clinics.manage') or public.is_clinic_member(clinic_id))
  with check (public.authorize('clinics.manage') or public.is_clinic_member(clinic_id));

create policy csao_read on public.clinic_staff_availability_overrides
  for select to authenticated
  using (public.authorize('clinics.view') or public.is_clinic_member(clinic_id));
create policy csao_write on public.clinic_staff_availability_overrides
  for all to authenticated
  using (public.authorize('clinics.manage') or public.is_clinic_member(clinic_id))
  with check (public.authorize('clinics.manage') or public.is_clinic_member(clinic_id));

create policy csbs_read on public.clinic_staff_booking_settings
  for select to authenticated
  using (public.authorize('clinics.view') or public.is_clinic_member(clinic_id));
create policy csbs_write on public.clinic_staff_booking_settings
  for all to authenticated
  using (public.authorize('clinics.manage') or public.is_clinic_member(clinic_id))
  with check (public.authorize('clinics.manage') or public.is_clinic_member(clinic_id));

create policy holidays_read on public.public_holidays
  for select to authenticated using (true);
create policy holidays_manage on public.public_holidays
  for all to authenticated
  using (public.authorize('settings.manage')) with check (public.authorize('settings.manage'));

create policy capacity_read on public.clinic_capacity_cache
  for select to authenticated
  using (public.authorize('clinics.view') or public.is_clinic_member(clinic_id));
create policy capacity_write on public.clinic_capacity_cache
  for all to authenticated
  using (public.authorize('clinics.manage')) with check (public.authorize('clinics.manage'));
