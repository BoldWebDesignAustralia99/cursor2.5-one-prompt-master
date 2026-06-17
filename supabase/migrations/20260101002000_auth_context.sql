-- ============================================================================
-- Auth bootstrap: me() returns the current user's profile, roles, resolved
-- permission keys, and clinic scope in ONE round trip (Architecture 01 §3:
-- ≤6 queries per page — this is the single identity query the shell needs).
-- ============================================================================

create or replace function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_super_admin() then (select array_agg(key) from public.permissions)
    else (
      select coalesce(array_agg(distinct k), '{}')
      from (
        -- role-granted keys, minus any explicit user denials
        select rp.permission_key as k
        from public.user_roles ur
        join public.role_permissions rp on rp.role_key = ur.role_key
        where ur.user_id = auth.uid() and rp.allowed
          and not exists (
            select 1 from public.user_permission_overrides o
            where o.user_id = auth.uid() and o.permission_key = rp.permission_key and o.allowed = false
          )
        union
        -- explicit user grants
        select o.permission_key
        from public.user_permission_overrides o
        where o.user_id = auth.uid() and o.allowed = true
      ) s
    )
  end;
$$;

create or replace function public.me()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_profile jsonb;
begin
  if auth.uid() is null then
    return null;
  end if;

  select to_jsonb(p.*) into v_profile from public.profiles p where p.id = auth.uid();

  return jsonb_build_object(
    'profile', v_profile,
    'roles', coalesce((select array_agg(role_key order by role_key) from public.user_roles where user_id = auth.uid()), '{}'),
    'permissions', coalesce(to_jsonb(public.my_permissions()), '[]'::jsonb),
    'clinic_ids', coalesce((select array_agg(clinic_id) from public.clinic_members where user_id = auth.uid()), '{}'),
    'is_super_admin', public.is_super_admin()
  );
end;
$$;
