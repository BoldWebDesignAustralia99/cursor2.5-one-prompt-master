-- ============================================================================
-- Workflow builder + execution engine (Architecture 01 §5; Feature 9.9).
-- Automations are DATA, not code: registered triggers/actions composed on a node
-- canvas, conditions via the rule-group engine, versioning, run logs. The AI
-- authors by writing this data; a human reviews, simulates, and enables.
-- ============================================================================

-- Registered triggers (grouped by domain) the engine can subscribe to.
create table public.workflow_trigger_registry (
  key            text primary key,          -- 'booking.outcome_showed' | 'lead.created' ...
  name           text not null,
  domain         text not null,             -- 'Leads' | 'Bookings' | 'Follow-up' | ...
  description    text,
  payload_schema jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- Registered actions the engine can run.
create table public.workflow_action_registry (
  key           text primary key,           -- 'sms.send' | 'pipeline.move_stage' ...
  name          text not null,
  domain        text not null,
  description   text,
  config_schema jsonb not null default '{}'::jsonb,
  is_terminal   boolean not null default false,
  created_at    timestamptz not null default now()
);

create type workflow_status as enum ('draft', 'active', 'disabled');

create table public.workflows (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text,
  trigger_key        text references public.workflow_trigger_registry (key),
  condition_group_id uuid references public.rule_groups (id) on delete set null,
  status             workflow_status not null default 'draft',
  version            int not null default 1,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index workflows_trigger_idx on public.workflows (trigger_key) where status = 'active';
create trigger trg_workflows_updated before update on public.workflows
  for each row execute function public.set_updated_at();

create type workflow_node_kind as enum ('trigger', 'action', 'condition', 'wait', 'branch');

create table public.workflow_nodes (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  kind        workflow_node_kind not null,
  action_key  text references public.workflow_action_registry (key),
  config      jsonb not null default '{}'::jsonb,
  position    jsonb not null default '{"x":0,"y":0}'::jsonb,
  label       text,
  sort_order  int not null default 100
);
create index workflow_nodes_workflow_idx on public.workflow_nodes (workflow_id);

create table public.workflow_edges (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references public.workflows (id) on delete cascade,
  from_node_id uuid not null references public.workflow_nodes (id) on delete cascade,
  to_node_id   uuid not null references public.workflow_nodes (id) on delete cascade,
  branch_label text
);
create index workflow_edges_workflow_idx on public.workflow_edges (workflow_id);

-- Immutable version snapshots (enable/disable + version history).
create table public.workflow_versions (
  id          uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows (id) on delete cascade,
  version     int not null,
  snapshot    jsonb not null,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  unique (workflow_id, version)
);

create type workflow_run_status as enum ('running', 'succeeded', 'failed', 'cancelled', 'simulated');

create table public.workflow_runs (
  id              uuid primary key default gen_random_uuid(),
  workflow_id     uuid not null references public.workflows (id) on delete cascade,
  version         int,
  entity_kind     entity_kind,
  entity_id       uuid,
  status          workflow_run_status not null default 'running',
  trigger_payload jsonb not null default '{}'::jsonb,
  error           text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);
create index workflow_runs_workflow_idx on public.workflow_runs (workflow_id, started_at desc);
create index workflow_runs_status_idx   on public.workflow_runs (status, started_at desc);

-- Per-action step logs with retries + idempotency.
create table public.workflow_run_steps (
  id              uuid primary key default gen_random_uuid(),
  run_id          uuid not null references public.workflow_runs (id) on delete cascade,
  node_id         uuid references public.workflow_nodes (id) on delete set null,
  action_key      text,
  status          workflow_run_status not null default 'running',
  attempts        int not null default 0,
  idempotency_key text,
  result          jsonb not null default '{}'::jsonb,
  error           text,
  ran_at          timestamptz not null default now(),
  unique (run_id, idempotency_key)
);
create index workflow_run_steps_run_idx on public.workflow_run_steps (run_id);

alter table public.workflow_trigger_registry enable row level security;
alter table public.workflow_action_registry  enable row level security;
alter table public.workflows                  enable row level security;
alter table public.workflow_nodes             enable row level security;
alter table public.workflow_edges             enable row level security;
alter table public.workflow_versions          enable row level security;
alter table public.workflow_runs              enable row level security;
alter table public.workflow_run_steps         enable row level security;

create policy wf_trigger_reg_read on public.workflow_trigger_registry
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_trigger_reg_manage on public.workflow_trigger_registry
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy wf_action_reg_read on public.workflow_action_registry
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_action_reg_manage on public.workflow_action_registry
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy workflows_read on public.workflows
  for select to authenticated using (public.authorize('workflows.view'));
create policy workflows_manage on public.workflows
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy wf_nodes_read on public.workflow_nodes
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_nodes_manage on public.workflow_nodes
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy wf_edges_read on public.workflow_edges
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_edges_manage on public.workflow_edges
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy wf_versions_read on public.workflow_versions
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_versions_manage on public.workflow_versions
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy wf_runs_read on public.workflow_runs
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_runs_manage on public.workflow_runs
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));

create policy wf_steps_read on public.workflow_run_steps
  for select to authenticated using (public.authorize('workflows.view'));
create policy wf_steps_manage on public.workflow_run_steps
  for all to authenticated using (public.authorize('workflows.manage')) with check (public.authorize('workflows.manage'));
