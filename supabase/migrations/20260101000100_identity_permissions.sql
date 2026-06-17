-- ============================================================================
-- Identity & Permission registry (Architecture 01 §4).
-- "Permissions at the DB first; UI hiding is cosmetic." Every page/action/field
-- has a permission key, with role defaults + per-user overrides, edited live.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null default '',
  email         text,
  avatar_url    text,
  phone         text,
  region        region not null default 'AU',
  timezone      text not null default 'Australia/Brisbane',
  is_active     boolean not null default true,
  primary_role  text,                         -- the role that drives their home screen
  last_seen_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Roles (extensible — not a hardcoded enum, so admins can add capabilities).
-- ---------------------------------------------------------------------------
create table public.roles (
  key                 text primary key,
  name                text not null,
  description         text,
  is_internal         boolean not null default true,   -- internal staff vs clinic-side
  has_calling_surface boolean not null default false,  -- 07: enforce "no calling" cleanly
  sort_order          int not null default 100,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Permission registry: every gated capability is a key grouped by domain.
-- ---------------------------------------------------------------------------
create table public.permissions (
  key         text primary key,              -- e.g. 'leads.call', 'finances.view'
  name        text not null,
  description text,
  domain      text not null,                 -- 'leads' | 'clinics' | 'finances' | ...
  is_sensitive boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Role → permission defaults.
create table public.role_permissions (
  role_key       text not null references public.roles (key) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  allowed        boolean not null default true,
  primary key (role_key, permission_key)
);

-- User → role assignments (a user may hold several roles / capabilities).
create table public.user_roles (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role_key    text not null references public.roles (key) on delete cascade,
  assigned_by uuid references public.profiles (id),
  assigned_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

-- Per-user overrides beat role defaults (grant or deny a single key).
create table public.user_permission_overrides (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  allowed        boolean not null,
  reason         text,
  set_by         uuid references public.profiles (id),
  set_at         timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create index on public.user_roles (role_key);
create index on public.user_permission_overrides (permission_key);

-- ---------------------------------------------------------------------------
-- Resolver functions. SECURITY DEFINER so they read the registry regardless of
-- the caller's RLS, and so policies can call them without recursion.
-- ---------------------------------------------------------------------------
create or replace function public.user_has_role(p_user uuid, p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.role_key = p_role
  );
$$;

create or replace function public.has_role(p_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_role(auth.uid(), p_role);
$$;

create or replace function public.is_super_admin(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = p_user and ur.role_key = 'super_admin'
  );
$$;

-- The core check: does this user have a permission key?
--   super_admin → always; else user override wins; else any granting role.
create or replace function public.user_has_permission(p_user uuid, p_perm text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_override boolean;
begin
  if p_user is null then
    return false;
  end if;

  if public.is_super_admin(p_user) then
    return true;
  end if;

  select allowed into v_override
  from public.user_permission_overrides
  where user_id = p_user and permission_key = p_perm;

  if v_override is not null then
    return v_override;
  end if;

  return exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_key = ur.role_key
    where ur.user_id = p_user
      and rp.permission_key = p_perm
      and rp.allowed = true
  );
end;
$$;

-- Current-user convenience used everywhere in policies and the services layer.
create or replace function public.authorize(p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.user_has_permission(auth.uid(), p_perm);
$$;

comment on function public.authorize(text) is
  'True if the current user holds the permission key (super_admin bypass, override, then role default).';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles                  enable row level security;
alter table public.roles                      enable row level security;
alter table public.permissions                enable row level security;
alter table public.role_permissions           enable row level security;
alter table public.user_roles                 enable row level security;
alter table public.user_permission_overrides  enable row level security;

-- Profiles: a user sees & edits their own; staff managers see all; admins manage all.
create policy profiles_select_self_or_staff on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.authorize('staff.view'));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.authorize('staff.manage')) with check (public.authorize('staff.manage'));

-- Registry tables are readable by any authenticated user (the UI needs them to
-- decide what to render); only permission managers may write.
create policy roles_read on public.roles
  for select to authenticated using (true);
create policy roles_manage on public.roles
  for all to authenticated
  using (public.authorize('permissions.manage')) with check (public.authorize('permissions.manage'));

create policy permissions_read on public.permissions
  for select to authenticated using (true);
create policy permissions_manage on public.permissions
  for all to authenticated
  using (public.authorize('permissions.manage')) with check (public.authorize('permissions.manage'));

create policy role_perms_read on public.role_permissions
  for select to authenticated using (true);
create policy role_perms_manage on public.role_permissions
  for all to authenticated
  using (public.authorize('permissions.manage')) with check (public.authorize('permissions.manage'));

create policy user_roles_read on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.authorize('staff.view'));
create policy user_roles_manage on public.user_roles
  for all to authenticated
  using (public.authorize('staff.manage')) with check (public.authorize('staff.manage'));

create policy user_overrides_read on public.user_permission_overrides
  for select to authenticated
  using (user_id = auth.uid() or public.authorize('permissions.manage'));
create policy user_overrides_manage on public.user_permission_overrides
  for all to authenticated
  using (public.authorize('permissions.manage')) with check (public.authorize('permissions.manage'));

-- ---------------------------------------------------------------------------
-- New auth users get a profile row automatically.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
