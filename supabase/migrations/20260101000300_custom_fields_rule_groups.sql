-- ============================================================================
-- Reusable engines: custom fields + rule groups (Architecture 01 §2, §5).
-- "Custom fields are data." "Rule groups are one engine" powering queue tabs,
-- call-flow routing, workflow conditions, segments, and forwarding.
-- ============================================================================

create type custom_field_type as enum (
  'text', 'long_text', 'number', 'currency', 'boolean',
  'date', 'datetime', 'select', 'multiselect', 'url', 'phone', 'email'
);

create table public.custom_field_definitions (
  id           uuid primary key default gen_random_uuid(),
  entity_kind  entity_kind not null,
  key          text not null,
  label        text not null,
  field_type   custom_field_type not null default 'text',
  options      jsonb not null default '[]'::jsonb,   -- for select/multiselect
  help_text    text,
  group_label  text,                                 -- visual grouping (e.g. 'Funding')
  is_required  boolean not null default false,
  is_active    boolean not null default true,
  sort_order   int not null default 100,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_kind, key)
);
create trigger trg_cfd_updated before update on public.custom_field_definitions
  for each row execute function public.set_updated_at();

create table public.custom_field_values (
  id            uuid primary key default gen_random_uuid(),
  definition_id uuid not null references public.custom_field_definitions (id) on delete cascade,
  entity_kind   entity_kind not null,
  entity_id     uuid not null,
  value         jsonb,
  updated_by    uuid references public.profiles (id),
  updated_at    timestamptz not null default now(),
  unique (definition_id, entity_id)
);
create index cfv_entity_idx on public.custom_field_values (entity_kind, entity_id);
create trigger trg_cfv_updated before update on public.custom_field_values
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Rule groups — nested AND/OR filter rule trees, reused by many features.
-- ---------------------------------------------------------------------------
create type rule_combinator as enum ('and', 'or');
create type rule_context as enum (
  'queue_tab', 'call_flow_routing', 'workflow_condition',
  'segment', 'forwarding', 'follow_up_eligibility', 'routing_matrix'
);

create table public.rule_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null default '',
  description   text,
  context       rule_context not null,
  combinator    rule_combinator not null default 'and',
  parent_id     uuid references public.rule_groups (id) on delete cascade,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index rule_groups_context_idx on public.rule_groups (context);
create index rule_groups_parent_idx  on public.rule_groups (parent_id);
create trigger trg_rule_groups_updated before update on public.rule_groups
  for each row execute function public.set_updated_at();

create table public.rules (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.rule_groups (id) on delete cascade,
  field      text not null,                 -- 'status' | 'custom.funding' | 'days_since' ...
  operator   text not null,                 -- 'eq' | 'neq' | 'in' | 'gt' | 'contains' ...
  value      jsonb,
  sort_order int not null default 100
);
create index rules_group_idx on public.rules (group_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.custom_field_definitions enable row level security;
alter table public.custom_field_values      enable row level security;
alter table public.rule_groups              enable row level security;
alter table public.rules                    enable row level security;

create policy cfd_read on public.custom_field_definitions
  for select to authenticated using (true);
create policy cfd_manage on public.custom_field_definitions
  for all to authenticated
  using (public.authorize('custom_fields.manage')) with check (public.authorize('custom_fields.manage'));

create policy cfv_read on public.custom_field_values
  for select to authenticated using (public.authorize('activities.view'));
create policy cfv_write on public.custom_field_values
  for all to authenticated
  using (public.authorize('custom_fields.write')) with check (public.authorize('custom_fields.write'));

create policy rule_groups_read on public.rule_groups
  for select to authenticated using (true);
create policy rule_groups_manage on public.rule_groups
  for all to authenticated
  using (public.authorize('settings.manage')) with check (public.authorize('settings.manage'));

create policy rules_read on public.rules
  for select to authenticated using (true);
create policy rules_manage on public.rules
  for all to authenticated
  using (public.authorize('settings.manage')) with check (public.authorize('settings.manage'));
