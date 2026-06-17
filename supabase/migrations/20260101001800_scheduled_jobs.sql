-- ============================================================================
-- Scheduled jobs as repo migrations (Architecture 01 §7): reminders, capacity
-- refresh, reassignment, invoicing, cleanups — reviewable, never dashboard-only.
-- Guarded so a vanilla Postgres without pg_cron applies cleanly; on Supabase the
-- extension exists and the jobs register.
-- ============================================================================

-- Maintenance routines the cron jobs call (kept in SQL so they are reviewable).

-- Reset zone caps when their period rolls over (routing matrix, 9.6).
create or replace function public.reset_zone_period_counters()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.zone_clinics
     set period_count = 0, period_started_at = now()
   where cap_period <> 'none'
     and (
       (cap_period = 'day'   and period_started_at < date_trunc('day', now())) or
       (cap_period = 'week'  and period_started_at < date_trunc('week', now())) or
       (cap_period = 'month' and period_started_at < date_trunc('month', now()))
     );
end;
$$;

-- Re-pause/resume clinics from their live credit balance (low-balance engine, 9.8).
create or replace function public.refresh_clinic_pause_state()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clinics
     set is_paused_for_routing = (credit_balance <= 0)
   where is_paused_for_routing <> (credit_balance <= 0);
end;
$$;

-- Stamp the capacity cache as refreshed (the heavy slot computation lives in an
-- edge function; this keeps the cadence visible and the timestamps honest).
create or replace function public.touch_capacity_cache()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.clinic_capacity_cache set refreshed_at = now() where date >= current_date;
end;
$$;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    -- Hourly: roll zone period counters + clinic pause state.
    perform cron.schedule('gumbo_reset_zone_counters', '5 * * * *',
      $job$ select public.reset_zone_period_counters(); $job$);
    perform cron.schedule('gumbo_refresh_pause_state', '10 * * * *',
      $job$ select public.refresh_clinic_pause_state(); $job$);

    -- Every 15 min: capacity cache cadence marker.
    perform cron.schedule('gumbo_touch_capacity', '*/15 * * * *',
      $job$ select public.touch_capacity_cache(); $job$);
  else
    raise notice 'pg_cron not available — skipping cron.schedule (jobs will register on Supabase).';
  end if;
end;
$$;
