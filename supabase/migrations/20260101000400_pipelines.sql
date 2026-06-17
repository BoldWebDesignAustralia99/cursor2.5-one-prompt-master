-- ============================================================================
-- Generic pipeline engine (Architecture 01 §2; Feature 9.12).
-- ONE structure configures patient booking, clinic acquisition, post-appointment
-- follow-up, and training/onboarding. Built once, reused — no bespoke boards.
-- ============================================================================

create type pipeline_kind as enum (
  'patient_booking', 'clinic_acquisition', 'follow_up', 'training_onboarding'
);

create table public.pipelines (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  kind        pipeline_kind not null,
  description text,
  is_active   boolean not null default true,
  region      region,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_pipelines_updated before update on public.pipelines
  for each row execute function public.set_updated_at();

create table public.pipeline_stages (
  id           uuid primary key default gen_random_uuid(),
  pipeline_id  uuid not null references public.pipelines (id) on delete cascade,
  key          text not null,
  name         text not null,
  sort_order   int not null default 100,
  is_won       boolean not null default false,
  is_lost      boolean not null default false,
  is_terminal  boolean not null default false,
  tone         text not null default 'neutral',   -- status dot tone
  target       jsonb not null default '{}'::jsonb, -- per-stage targets
  created_at   timestamptz not null default now(),
  unique (pipeline_id, key)
);
create index pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id, sort_order);

create table public.pipeline_items (
  id               uuid primary key default gen_random_uuid(),
  pipeline_id      uuid not null references public.pipelines (id) on delete cascade,
  stage_id         uuid not null references public.pipeline_stages (id),
  entity_kind      entity_kind not null,
  entity_id        uuid not null,
  owner_id         uuid references public.profiles (id) on delete set null,
  title            text not null default '',
  value_cents      bigint not null default 0,
  currency         text not null default 'AUD',
  priority         numeric not null default 0,        -- computed score for ordering
  entered_stage_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  next_action_at   timestamptz,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (pipeline_id, entity_kind, entity_id)
);
create index pipeline_items_stage_idx    on public.pipeline_items (stage_id, priority desc);
create index pipeline_items_owner_idx    on public.pipeline_items (owner_id, next_action_at);
create index pipeline_items_pipeline_idx on public.pipeline_items (pipeline_id, last_activity_at desc);
create index pipeline_items_entity_idx   on public.pipeline_items (entity_kind, entity_id);
create trigger trg_pipeline_items_updated before update on public.pipeline_items
  for each row execute function public.set_updated_at();

-- Move an item to a new stage, stamping entered_stage_at and logging to activities.
create or replace function public.move_pipeline_item(p_item uuid, p_stage uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item   public.pipeline_items;
  v_from   text;
  v_to     text;
begin
  select * into v_item from public.pipeline_items where id = p_item;
  if not found then raise exception 'pipeline item % not found', p_item; end if;

  select name into v_from from public.pipeline_stages where id = v_item.stage_id;
  select name into v_to   from public.pipeline_stages where id = p_stage;

  update public.pipeline_items
     set stage_id = p_stage,
         entered_stage_at = now(),
         last_activity_at = now()
   where id = p_item;

  perform public.log_activity(
    'pipeline_item', p_item, 'stage_changed',
    format('Moved from %s to %s', coalesce(v_from, '—'), coalesce(v_to, '—')),
    jsonb_build_object('from_stage', v_item.stage_id, 'to_stage', p_stage)
  );
end;
$$;

alter table public.pipelines       enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.pipeline_items  enable row level security;

create policy pipelines_read on public.pipelines
  for select to authenticated using (true);
create policy pipelines_manage on public.pipelines
  for all to authenticated
  using (public.authorize('pipelines.manage')) with check (public.authorize('pipelines.manage'));

create policy pipeline_stages_read on public.pipeline_stages
  for select to authenticated using (true);
create policy pipeline_stages_manage on public.pipeline_stages
  for all to authenticated
  using (public.authorize('pipelines.manage')) with check (public.authorize('pipelines.manage'));

-- Items: visible to those who can view the pipeline domain; owners always see theirs.
create policy pipeline_items_read on public.pipeline_items
  for select to authenticated
  using (owner_id = auth.uid() or public.authorize('pipelines.view'));
create policy pipeline_items_write on public.pipeline_items
  for all to authenticated
  using (owner_id = auth.uid() or public.authorize('pipelines.manage'))
  with check (owner_id = auth.uid() or public.authorize('pipelines.manage'));
