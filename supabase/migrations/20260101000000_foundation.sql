-- ============================================================================
-- Gumbo Connect v2 — Foundation: extensions, shared enums, helper functions.
-- Architecture 01 §2 (the spine), §4 (RLS-first), §7 (migrations in repo).
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;       -- fuzzy search on names/phones
create extension if not exists btree_gist;    -- exclusion constraints (no double-booking)

-- ---------------------------------------------------------------------------
-- Shared enums. Domain-specific enums live with their feature migration.
-- ---------------------------------------------------------------------------
create type region as enum ('AU', 'USA');

create type comm_channel as enum ('call', 'sms', 'email', 'portal_message', 'internal_note');
create type comm_direction as enum ('inbound', 'outbound', 'internal');
create type comm_status as enum (
  'queued', 'sending', 'sent', 'delivered', 'failed',
  'received', 'completed', 'no_answer', 'busy', 'voicemail'
);

-- Polymorphic link target shared by communications + activities.
create type entity_kind as enum (
  'lead', 'clinic', 'booking', 'staff', 'pipeline_item',
  'invoice', 'payment', 'workflow_run', 'call_session', 'follow_up'
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger (used by virtually every table).
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- The current authenticated user id (thin wrapper so app code/policies are uniform).
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

comment on function public.current_user_id() is
  'Convenience wrapper over auth.uid() used by RLS policies and RPCs.';
