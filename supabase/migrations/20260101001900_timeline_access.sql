-- ============================================================================
-- Polymorphic timeline access. communications/activities link to entities by
-- (entity_kind, entity_id); a row is visible iff the caller can access the
-- linked record. This keeps the spine DB-enforced rather than blanket-granted
-- (Architecture 01 §4) — e.g. a rep sees a lead's timeline only for their leads.
-- ============================================================================

create or replace function public.can_access_entity(p_kind entity_kind, p_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_id is null then
    return false;
  end if;

  case p_kind
    when 'lead' then
      return public.authorize('leads.view')
          or exists (select 1 from public.leads l where l.id = p_id and l.assigned_to = auth.uid());
    when 'clinic' then
      return public.authorize('clinics.view') or public.is_clinic_member(p_id);
    when 'booking' then
      return public.authorize('bookings.view')
          or exists (select 1 from public.bookings b
                     where b.id = p_id
                       and (b.rep_id = auth.uid() or public.is_clinic_member(b.clinic_id)));
    when 'staff' then
      return p_id = auth.uid() or public.authorize('staff.view');
    when 'follow_up' then
      return public.authorize('followup.view');
    when 'invoice' then
      return public.authorize('billing.view')
          or exists (select 1 from public.invoices i where i.id = p_id and public.is_clinic_admin(i.clinic_id));
    when 'pipeline_item' then
      return public.authorize('pipelines.view')
          or exists (select 1 from public.pipeline_items pi where pi.id = p_id and pi.owner_id = auth.uid());
    else
      return public.authorize('activities.view');
  end case;
end;
$$;

-- Replace the blanket spine read policies with entity-scoped ones.
drop policy if exists comms_read on public.communications;
create policy comms_read on public.communications
  for select to authenticated
  using (
    author_id = auth.uid()
    or public.can_access_entity(entity_kind, entity_id)
    or (secondary_id is not null and public.can_access_entity(secondary_kind, secondary_id))
  );

drop policy if exists activities_read on public.activities;
create policy activities_read on public.activities
  for select to authenticated
  using (
    actor_id = auth.uid()
    or public.can_access_entity(entity_kind, entity_id)
  );
