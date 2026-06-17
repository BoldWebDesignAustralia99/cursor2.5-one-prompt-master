-- ============================================================================
-- Money: credit_packages, credit_ledger, payments, invoices (+ line items),
-- GoCardless mandates (Architecture 01 §2; Feature 9.8).
-- Patient deposits (Stripe) and clinic billing (GoCardless) share the `payments`
-- vocabulary but are distinct flows and never mixed.
-- ============================================================================

create type payment_kind     as enum ('patient_deposit', 'credit_purchase', 'follow_up_fee');
create type payment_provider as enum ('stripe', 'gocardless', 'manual');
create type payment_status   as enum ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled');
create type invoice_status   as enum ('draft', 'issued', 'paid', 'failed', 'void');
create type mandate_scheme   as enum ('becs', 'ach');
create type mandate_status   as enum ('pending', 'active', 'failed', 'cancelled');

create table public.credit_packages (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  credits                  int not null check (credits > 0),
  price_cents              int not null,
  currency                 text not null default 'AUD',
  region                   region not null default 'AU',
  target_billable_bookings int,                    -- package progress target (9.2)
  clinic_id                uuid references public.clinics (id) on delete cascade,  -- null = global
  is_active                boolean not null default true,
  created_at               timestamptz not null default now()
);
create index credit_packages_clinic_idx on public.credit_packages (clinic_id);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  kind         payment_kind not null,
  provider     payment_provider not null,
  provider_ref text,                              -- Stripe PI / GoCardless payment id
  clinic_id    uuid references public.clinics (id) on delete set null,
  lead_id      uuid references public.leads (id) on delete set null,
  booking_id   uuid references public.bookings (id) on delete set null,
  amount_cents int not null,
  currency     text not null default 'AUD',
  status       payment_status not null default 'pending',
  failure_reason text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index payments_clinic_idx   on public.payments (clinic_id, created_at desc);
create index payments_status_idx   on public.payments (status, created_at desc);
create index payments_provider_idx on public.payments (provider, provider_ref);
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

-- bookings.deposit_payment_id → payments (deferred FK from the bookings migration).
alter table public.bookings
  add constraint bookings_deposit_payment_fk
  foreign key (deposit_payment_id) references public.payments (id) on delete set null;

-- Append-only credit ledger; the clinic's cached balance is derived from it.
create table public.credit_ledger (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  delta         int not null,                    -- +purchase, -consume, +refund
  reason        text not null,
  balance_after int not null,
  booking_id    uuid references public.bookings (id) on delete set null,
  payment_id    uuid references public.payments (id) on delete set null,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);
create index credit_ledger_clinic_idx on public.credit_ledger (clinic_id, created_at desc);

-- Apply a ledger movement atomically: lock the clinic row, compute the new
-- balance, write the ledger row, update the cached balance and pause state.
create or replace function public.apply_credit_movement(
  p_clinic uuid,
  p_delta  int,
  p_reason text,
  p_booking uuid default null,
  p_payment uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  select credit_balance into v_balance from public.clinics where id = p_clinic for update;
  if v_balance is null then raise exception 'clinic % not found', p_clinic; end if;

  v_balance := v_balance + p_delta;

  insert into public.credit_ledger (clinic_id, delta, reason, balance_after, booking_id, payment_id, created_by)
  values (p_clinic, p_delta, p_reason, v_balance, p_booking, p_payment, auth.uid());

  update public.clinics
     set credit_balance = v_balance,
         is_paused_for_routing = (v_balance <= 0),
         updated_at = now()
   where id = p_clinic;

  perform public.log_activity(
    'clinic', p_clinic, 'credit_movement',
    format('%s credit(s): %s', p_delta, p_reason),
    jsonb_build_object('delta', p_delta, 'balance_after', v_balance)
  );
  return v_balance;
end;
$$;

create table public.invoices (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  number       text not null unique,
  status       invoice_status not null default 'draft',
  amount_cents int not null default 0,
  tax_cents    int not null default 0,
  currency     text not null default 'AUD',
  pdf_url      text,
  payment_id   uuid references public.payments (id) on delete set null,
  issued_at    timestamptz,
  due_at       timestamptz,
  paid_at      timestamptz,
  xero_ref     text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index invoices_clinic_idx on public.invoices (clinic_id, created_at desc);
create index invoices_status_idx on public.invoices (status);
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_line_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices (id) on delete cascade,
  description      text not null,
  quantity         numeric not null default 1,
  unit_amount_cents int not null,
  total_cents      int not null,
  sort_order       int not null default 100
);
create index invoice_lines_invoice_idx on public.invoice_line_items (invoice_id);

create table public.gocardless_mandates (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  provider_ref text,
  scheme       mandate_scheme not null default 'becs',
  status       mandate_status not null default 'pending',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index gc_mandates_clinic_idx on public.gocardless_mandates (clinic_id);
create trigger trg_mandates_updated before update on public.gocardless_mandates
  for each row execute function public.set_updated_at();

alter table public.credit_packages    enable row level security;
alter table public.payments            enable row level security;
alter table public.credit_ledger       enable row level security;
alter table public.invoices            enable row level security;
alter table public.invoice_line_items  enable row level security;
alter table public.gocardless_mandates enable row level security;

-- Packages: anyone who can view billing or is a clinic member can read; admins manage.
create policy packages_read on public.credit_packages
  for select to authenticated
  using (public.authorize('billing.view') or (clinic_id is not null and public.is_clinic_member(clinic_id)) or clinic_id is null);
create policy packages_manage on public.credit_packages
  for all to authenticated
  using (public.authorize('billing.manage')) with check (public.authorize('billing.manage'));

-- Payments / ledger / invoices: internal billing viewers see all; clinic admins
-- see only their clinic's money.
create policy payments_read on public.payments
  for select to authenticated
  using (public.authorize('billing.view') or (clinic_id is not null and public.is_clinic_admin(clinic_id)));
create policy payments_manage on public.payments
  for all to authenticated
  using (public.authorize('billing.manage')) with check (public.authorize('billing.manage'));

create policy ledger_read on public.credit_ledger
  for select to authenticated
  using (public.authorize('billing.view') or public.is_clinic_member(clinic_id));
create policy ledger_manage on public.credit_ledger
  for all to authenticated
  using (public.authorize('billing.manage')) with check (public.authorize('billing.manage'));

create policy invoices_read on public.invoices
  for select to authenticated
  using (public.authorize('billing.view') or public.is_clinic_admin(clinic_id));
create policy invoices_manage on public.invoices
  for all to authenticated
  using (public.authorize('billing.manage')) with check (public.authorize('billing.manage'));

create policy invoice_lines_read on public.invoice_line_items
  for select to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id
                 and (public.authorize('billing.view') or public.is_clinic_admin(i.clinic_id))));
create policy invoice_lines_manage on public.invoice_line_items
  for all to authenticated
  using (public.authorize('billing.manage')) with check (public.authorize('billing.manage'));

create policy mandates_read on public.gocardless_mandates
  for select to authenticated
  using (public.authorize('billing.view') or public.is_clinic_admin(clinic_id));
create policy mandates_manage on public.gocardless_mandates
  for all to authenticated
  using (public.authorize('billing.manage') or public.is_clinic_admin(clinic_id))
  with check (public.authorize('billing.manage') or public.is_clinic_admin(clinic_id));
