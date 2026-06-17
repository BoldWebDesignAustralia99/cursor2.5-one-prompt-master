-- ============================================================================
-- Bookings + classification engine (Features 9.1 #5, 9.2).
-- A GiST exclusion constraint makes double-booking impossible at insert time.
-- Classification drives billing; billable↔non-billable flips correct the ledger.
-- ============================================================================

create type booking_status as enum (
  'scheduled', 'confirmed', 'showed', 'no_show', 'cancelled', 'rescheduled'
);

create type deposit_status as enum ('none', 'pending', 'paid', 'refunded', 'failed');

create type classification_source as enum ('transcript', 'clinic_data', 'keyword', 'manual');

-- Billable map is settings-editable, so classes live in a table not an enum.
create table public.classification_classes (
  key         text primary key,         -- 'multi_implant' | 'all_on_x' | ...
  name        text not null,
  is_billable boolean not null default false,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_classes_updated before update on public.classification_classes
  for each row execute function public.set_updated_at();

create table public.bookings (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads (id) on delete cascade,
  clinic_id        uuid not null references public.clinics (id),
  practitioner_id  uuid references public.clinic_practitioners (id),
  rep_id           uuid references public.profiles (id) on delete set null,

  scheduled_at     timestamptz not null,
  duration_minutes int not null default 60,
  -- Range used by the no-double-booking exclusion constraint; maintained by a
  -- trigger (timestamptz arithmetic is not IMMUTABLE, so a generated column
  -- cannot be used here).
  time_range       tstzrange,

  status           booking_status not null default 'scheduled',
  deposit_status   deposit_status not null default 'none',
  deposit_amount_cents int not null default 0,
  deposit_currency text not null default 'AUD',
  deposit_payment_id uuid,                 -- → payments (added later)

  -- Cached classification (history in booking_classifications).
  class_key        text references public.classification_classes (key),
  is_billable      boolean not null default false,
  classification_locked boolean not null default false,

  ai_brief         text,                   -- shown to the clinic (persona 06)
  compliance       jsonb not null default '{}'::jsonb,  -- AI sales-compliance summary (9.4)

  outcome_confirmed_at timestamptz,
  outcome_by       uuid references public.profiles (id),

  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- No two live bookings for the same practitioner can overlap.
  constraint no_double_booking exclude using gist (
    practitioner_id with =,
    time_range with &&
  ) where (status in ('scheduled', 'confirmed', 'showed') and practitioner_id is not null)
);
create or replace function public.bookings_set_time_range()
returns trigger
language plpgsql
as $$
begin
  new.time_range := tstzrange(
    new.scheduled_at,
    new.scheduled_at + make_interval(mins => new.duration_minutes)
  );
  return new;
end;
$$;
create trigger trg_bookings_time_range before insert or update of scheduled_at, duration_minutes
  on public.bookings for each row execute function public.bookings_set_time_range();

create index bookings_clinic_idx   on public.bookings (clinic_id, scheduled_at);
create index bookings_rep_idx       on public.bookings (rep_id, scheduled_at desc);
create index bookings_lead_idx      on public.bookings (lead_id);
create index bookings_status_idx    on public.bookings (status, scheduled_at);
create index bookings_billable_idx  on public.bookings (is_billable) where is_billable;
create trigger trg_bookings_updated before update on public.bookings
  for each row execute function public.set_updated_at();

-- Classification history with source/priority/locking (9.2).
create table public.booking_classifications (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings (id) on delete cascade,
  class_key   text not null references public.classification_classes (key),
  is_billable boolean not null,
  source      classification_source not null,
  confidence  numeric,
  locked      boolean not null default false,
  reasoning   text,                          -- AI reasoning (staff names stripped)
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index booking_class_booking_idx on public.booking_classifications (booking_id, created_at desc);

-- Reclassification review workflow (request + attachments → admin queue → decide).
create type review_status as enum ('pending', 'approved', 'rejected');

create table public.classification_reviews (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings (id) on delete cascade,
  requested_by uuid references public.profiles (id),
  proposed_class_key text references public.classification_classes (key),
  status       review_status not null default 'pending',
  attachments  jsonb not null default '[]'::jsonb,
  note         text,
  decided_by   uuid references public.profiles (id),
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index class_reviews_status_idx on public.classification_reviews (status, created_at);

alter table public.classification_classes  enable row level security;
alter table public.bookings                 enable row level security;
alter table public.booking_classifications  enable row level security;
alter table public.classification_reviews   enable row level security;

create policy classes_read on public.classification_classes
  for select to authenticated using (true);
create policy classes_manage on public.classification_classes
  for all to authenticated
  using (public.authorize('settings.manage')) with check (public.authorize('settings.manage'));

-- Bookings: internal viewers see all; the booking rep sees theirs; clinic members
-- see bookings at their clinic (their incoming patients).
create policy bookings_read on public.bookings
  for select to authenticated
  using (
    rep_id = auth.uid()
    or public.authorize('bookings.view')
    or public.is_clinic_member(clinic_id)
  );
create policy bookings_write on public.bookings
  for all to authenticated
  using (rep_id = auth.uid() or public.authorize('bookings.manage'))
  with check (rep_id = auth.uid() or public.authorize('bookings.manage'));
-- Clinic members confirm outcomes (a constrained update) for their clinic.
create policy bookings_clinic_outcome on public.bookings
  for update to authenticated
  using (public.is_clinic_member(clinic_id))
  with check (public.is_clinic_member(clinic_id));

create policy booking_class_read on public.booking_classifications
  for select to authenticated
  using (public.authorize('bookings.view'));
create policy booking_class_write on public.booking_classifications
  for all to authenticated
  using (public.authorize('classification.manage')) with check (public.authorize('classification.manage'));

create policy class_reviews_read on public.classification_reviews
  for select to authenticated
  using (requested_by = auth.uid() or public.authorize('classification.review'));
create policy class_reviews_write on public.classification_reviews
  for all to authenticated
  using (public.authorize('classification.review') or requested_by = auth.uid())
  with check (public.authorize('classification.review') or requested_by = auth.uid());
