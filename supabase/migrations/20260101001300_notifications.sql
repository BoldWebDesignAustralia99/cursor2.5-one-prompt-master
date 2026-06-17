-- ============================================================================
-- Notifications engine (Feature 9.10). One engine; every event emits a typed key;
-- admin-editable routing maps event → roles/users → channels. Per-role feeds,
-- deep-links, realtime, preferences (per-event email + daily digest).
-- ============================================================================

create table public.notification_event_types (
  key             text primary key,         -- 'booking.created' | 'clinic.low_balance' ...
  name            text not null,
  domain          text not null,
  description     text,
  default_channels jsonb not null default '["in_app"]'::jsonb,  -- in_app | email | sms
  is_urgent       boolean not null default false,               -- urgent always immediate
  created_at      timestamptz not null default now()
);

-- Admin-editable routing: who receives an event and on which channels.
create table public.notification_routes (
  id          uuid primary key default gen_random_uuid(),
  event_key   text not null references public.notification_event_types (key) on delete cascade,
  role_key    text references public.roles (key) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  channels    jsonb not null default '["in_app"]'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  check (role_key is not null or user_id is not null)
);
create index notif_routes_event_idx on public.notification_routes (event_key);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  event_key   text references public.notification_event_types (key),
  title       text not null,
  body        text,
  link_kind   entity_kind,
  link_id     uuid,
  is_read     boolean not null default false,
  read_at     timestamptz,
  channel_results jsonb not null default '{}'::jsonb,  -- {email:'sent', sms:'skipped'}
  created_at  timestamptz not null default now()
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx     on public.notifications (recipient_id) where is_read = false;

create table public.notification_preferences (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  event_key     text not null references public.notification_event_types (key) on delete cascade,
  email_enabled boolean not null default true,
  daily_digest  boolean not null default false,
  primary key (user_id, event_key)
);

-- Append a notification to a user's feed.
create or replace function public.notify_user(
  p_recipient uuid,
  p_event     text,
  p_title     text,
  p_body      text default null,
  p_link_kind entity_kind default null,
  p_link_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.notifications (recipient_id, event_key, title, body, link_kind, link_id)
  values (p_recipient, p_event, p_title, p_body, p_link_kind, p_link_id)
  returning id into v_id;
  return v_id;
end;
$$;

alter table public.notification_event_types enable row level security;
alter table public.notification_routes       enable row level security;
alter table public.notifications             enable row level security;
alter table public.notification_preferences  enable row level security;

create policy notif_events_read on public.notification_event_types
  for select to authenticated using (true);
create policy notif_events_manage on public.notification_event_types
  for all to authenticated using (public.authorize('notifications.manage')) with check (public.authorize('notifications.manage'));

create policy notif_routes_read on public.notification_routes
  for select to authenticated using (public.authorize('notifications.manage'));
create policy notif_routes_manage on public.notification_routes
  for all to authenticated using (public.authorize('notifications.manage')) with check (public.authorize('notifications.manage'));

-- Users only ever see their own notifications.
create policy notifications_read on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy notifications_update on public.notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy notif_prefs_rw on public.notification_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
