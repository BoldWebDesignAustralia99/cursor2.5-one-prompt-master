-- ============================================================================
-- Analytics: server-side aggregation only (Architecture 01 §3).
-- Enriched views for feeds + composed dashboard RPCs for the executive/floor
-- screens. Views use security_invoker so RLS still decides visibility.
-- ============================================================================

-- Bookings feed (persona 03/05/06): one indexed read, no client joins.
create view public.v_bookings_enriched
with (security_invoker = true) as
select
  b.id,
  b.scheduled_at,
  b.status,
  b.deposit_status,
  b.deposit_amount_cents,
  b.deposit_currency,
  b.is_billable,
  b.class_key,
  cc.name              as class_name,
  b.ai_brief,
  b.compliance,
  b.clinic_id,
  cl.name              as clinic_name,
  cl.timezone          as clinic_timezone,
  b.practitioner_id,
  pr.full_name         as practitioner_name,
  pr.senior            as practitioner_senior,
  b.rep_id,
  rp.full_name         as rep_name,
  b.lead_id,
  ld.full_name         as patient_name,
  ld.phone             as patient_phone,
  b.created_at
from public.bookings b
left join public.clinics cl              on cl.id = b.clinic_id
left join public.clinic_practitioners pr on pr.id = b.practitioner_id
left join public.profiles rp             on rp.id = b.rep_id
left join public.leads ld                on ld.id = b.lead_id
left join public.classification_classes cc on cc.key = b.class_key;

-- Clinic credit health (persona 03/06).
create view public.v_clinic_health
with (security_invoker = true) as
select
  c.id,
  c.name,
  c.region,
  c.lifecycle_stage,
  c.credit_balance,
  c.low_balance_threshold,
  c.is_paused_for_routing,
  case
    when c.credit_balance <= 0 then 'zero'
    when c.credit_balance <= c.low_balance_threshold then 'low'
    else 'healthy'
  end as credit_state,
  (select count(*) from public.bookings b
     where b.clinic_id = c.id and b.scheduled_at::date = current_date) as bookings_today
from public.clinics c;

-- ---------------------------------------------------------------------------
-- admin_overview — the Command Center payload, composed in one round trip.
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview(
  p_from   timestamptz default date_trunc('day', now()),
  p_to     timestamptz default now(),
  p_region region default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_today    jsonb;
  v_money    jsonb;
  v_clinics  jsonb;
  v_sales    jsonb;
begin
  select jsonb_build_object(
    'bookings', count(*) filter (where b.created_at between p_from and p_to),
    'shows', count(*) filter (where b.status = 'showed' and b.created_at between p_from and p_to),
    'no_shows', count(*) filter (where b.status = 'no_show' and b.created_at between p_from and p_to),
    'deposits_cents', coalesce(sum(b.deposit_amount_cents) filter (
        where b.deposit_status = 'paid' and b.created_at between p_from and p_to), 0)
  )
  into v_today
  from public.bookings b
  left join public.clinics c on c.id = b.clinic_id
  where (p_region is null or c.region = p_region);

  select jsonb_build_object(
    'new_leads', (select count(*) from public.leads l
                   where l.created_at between p_from and p_to
                     and (p_region is null or l.region = p_region)),
    'answered_call_rate', (
       select case when count(*) = 0 then null
              else round(count(*) filter (where cs.answered_at is not null)::numeric / count(*), 4) end
       from public.call_sessions cs
       where cs.started_at between p_from and p_to)
  )
  into v_sales;

  select jsonb_build_object(
    'revenue_cents', coalesce(sum(p.amount_cents) filter (
        where p.kind = 'credit_purchase' and p.status = 'succeeded'
          and p.created_at between p_from and p_to), 0),
    'failed_payments', count(*) filter (where p.status = 'failed' and p.created_at between p_from and p_to),
    'invoices_issued', (select count(*) from public.invoices i
                         where i.status in ('issued','paid') and i.issued_at between p_from and p_to)
  )
  into v_money
  from public.payments p;

  select jsonb_build_object(
    'active', count(*) filter (where credit_state = 'healthy'),
    'low', count(*) filter (where credit_state = 'low'),
    'zero', count(*) filter (where credit_state = 'zero'),
    'paused', count(*) filter (where is_paused_for_routing)
  )
  into v_clinics
  from public.v_clinic_health
  where (p_region is null or region = p_region);

  return jsonb_build_object(
    'today', v_today,
    'sales', v_sales,
    'money', v_money,
    'clinics', v_clinics,
    'period', jsonb_build_object('from', p_from, 'to', p_to, 'region', p_region)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- rep_leaderboard — booked/shown/deposit/compliance per rep over a period.
-- ---------------------------------------------------------------------------
create or replace function public.rep_leaderboard(
  p_from timestamptz default date_trunc('week', now()),
  p_to   timestamptz default now()
)
returns table (
  rep_id uuid,
  rep_name text,
  bookings bigint,
  shows bigint,
  deposits_cents bigint,
  avg_grade numeric,
  compliance_pass_rate numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    count(b.id) filter (where b.created_at between p_from and p_to) as bookings,
    count(b.id) filter (where b.status = 'showed' and b.created_at between p_from and p_to) as shows,
    coalesce(sum(b.deposit_amount_cents) filter (
      where b.deposit_status = 'paid' and b.created_at between p_from and p_to), 0) as deposits_cents,
    (select round(avg(r.overall_score), 1) from public.call_analysis_reports r
       where r.rep_id = p.id and r.created_at between p_from and p_to) as avg_grade,
    (select case when count(*) = 0 then null
            else round(count(*) filter (where (cc.price_provided and cc.finance_discussed and cc.deposit_explained))::numeric / count(*), 4) end
       from public.booking_compliance_checks cc
       join public.bookings bb on bb.id = cc.booking_id
       where bb.rep_id = p.id and cc.created_at between p_from and p_to) as compliance_pass_rate
  from public.profiles p
  left join public.bookings b on b.rep_id = p.id
  where exists (select 1 from public.user_roles ur where ur.user_id = p.id and ur.role_key in ('sales_rep','followup_rep'))
  group by p.id, p.full_name
  order by bookings desc, shows desc;
$$;

-- ---------------------------------------------------------------------------
-- followup_overview — consult→sale conversion and revenue closed (persona 08).
-- ---------------------------------------------------------------------------
create or replace function public.followup_overview(
  p_from timestamptz default date_trunc('month', now()),
  p_to   timestamptz default now()
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'won', count(*) filter (where result = 'won'),
    'lost', count(*) filter (where result = 'lost'),
    'revenue_closed_cents', coalesce(sum(treatment_value_cents) filter (where result = 'won'), 0),
    'fees_cents', coalesce(sum(fee_cents) filter (where result = 'won'), 0),
    'conversion', case when count(*) = 0 then null
                  else round(count(*) filter (where result = 'won')::numeric / count(*), 4) end
  )
  from public.follow_up_outcomes
  where attributed_at between p_from and p_to;
$$;
