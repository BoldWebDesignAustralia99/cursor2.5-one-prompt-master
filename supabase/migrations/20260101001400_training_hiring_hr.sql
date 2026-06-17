-- ============================================================================
-- Training journeys (Feature 9.11), hiring (group interview → offer → onboarding),
-- and HR surfaces (timesheets, leave). Courses live INSIDE journeys.
-- ============================================================================

create type journey_stage_kind as enum (
  'course_video', 'quiz', 'script_drill', 'ai_practice_call', 'call_review'
);

create table public.journeys (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  pipeline_id uuid references public.pipelines (id) on delete set null,  -- onboarding pipeline link
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_journeys_updated before update on public.journeys
  for each row execute function public.set_updated_at();

create table public.journey_stages (
  id              uuid primary key default gen_random_uuid(),
  journey_id      uuid not null references public.journeys (id) on delete cascade,
  kind            journey_stage_kind not null,
  name            text not null,
  config          jsonb not null default '{}'::jsonb,   -- video url, quiz sections, drill prompt...
  requires_signoff boolean not null default false,
  sort_order      int not null default 100
);
create index journey_stages_journey_idx on public.journey_stages (journey_id, sort_order);

create type enrollment_status as enum ('active', 'completed', 'paused');

create table public.journey_enrollments (
  id           uuid primary key default gen_random_uuid(),
  journey_id   uuid not null references public.journeys (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  status       enrollment_status not null default 'active',
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  unique (journey_id, user_id)
);
create index enrollments_user_idx on public.journey_enrollments (user_id);

create type stage_progress_status as enum ('not_started', 'in_progress', 'completed', 'signed_off');

create table public.journey_stage_progress (
  id            uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.journey_enrollments (id) on delete cascade,
  stage_id      uuid not null references public.journey_stages (id) on delete cascade,
  status        stage_progress_status not null default 'not_started',
  score         numeric,
  attempts      int not null default 0,
  signed_off_by uuid references public.profiles (id),
  signed_off_at timestamptz,
  data          jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now(),
  unique (enrollment_id, stage_id)
);
create trigger trg_stage_progress_updated before update on public.journey_stage_progress
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Hiring
-- ---------------------------------------------------------------------------
create type candidate_status as enum ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected');

create table public.candidates (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text,
  phone      text,
  status     candidate_status not null default 'applied',
  source     text,
  resume_url text,
  scorecard  jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidates_status_idx on public.candidates (status);
create trigger trg_candidates_updated before update on public.candidates
  for each row execute function public.set_updated_at();

create table public.interviews (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates (id) on delete cascade,
  kind         text not null default 'group_video',
  scheduled_at timestamptz,
  scorecard    jsonb not null default '{}'::jsonb,
  outcome      text,
  created_at   timestamptz not null default now()
);
create index interviews_candidate_idx on public.interviews (candidate_id);

create table public.offer_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  body       text not null,
  variables  jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create type offer_status as enum ('draft', 'sent', 'accepted', 'declined');

create table public.offers (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid not null references public.candidates (id) on delete cascade,
  template_id     uuid references public.offer_templates (id),
  status          offer_status not null default 'draft',
  body            text,
  sent_at         timestamptz,
  accepted_at     timestamptz,
  created_user_id uuid references public.profiles (id),   -- staff created on acceptance
  created_at      timestamptz not null default now()
);
create index offers_candidate_idx on public.offers (candidate_id);

-- ---------------------------------------------------------------------------
-- HR: timesheets + leave
-- ---------------------------------------------------------------------------
create type approval_status as enum ('pending', 'approved', 'declined');

create table public.timesheets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  clock_in    timestamptz not null,
  clock_out   timestamptz,
  status      approval_status not null default 'pending',
  approved_by uuid references public.profiles (id),
  note        text,
  created_at  timestamptz not null default now()
);
create index timesheets_user_idx on public.timesheets (user_id, clock_in desc);

create table public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  leave_type  text not null default 'annual',
  start_date  date not null,
  end_date    date not null,
  status      approval_status not null default 'pending',
  reason      text,
  decided_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index leave_user_idx on public.leave_requests (user_id, start_date desc);

alter table public.journeys               enable row level security;
alter table public.journey_stages          enable row level security;
alter table public.journey_enrollments     enable row level security;
alter table public.journey_stage_progress  enable row level security;
alter table public.candidates              enable row level security;
alter table public.interviews              enable row level security;
alter table public.offer_templates         enable row level security;
alter table public.offers                  enable row level security;
alter table public.timesheets              enable row level security;
alter table public.leave_requests          enable row level security;

create policy journeys_read on public.journeys
  for select to authenticated using (public.authorize('training.view'));
create policy journeys_manage on public.journeys
  for all to authenticated using (public.authorize('training.manage')) with check (public.authorize('training.manage'));

create policy journey_stages_read on public.journey_stages
  for select to authenticated using (public.authorize('training.view'));
create policy journey_stages_manage on public.journey_stages
  for all to authenticated using (public.authorize('training.manage')) with check (public.authorize('training.manage'));

-- Trainees see their own enrolments/progress; trainers see all.
create policy enrollments_read on public.journey_enrollments
  for select to authenticated using (user_id = auth.uid() or public.authorize('training.manage'));
create policy enrollments_write on public.journey_enrollments
  for all to authenticated
  using (user_id = auth.uid() or public.authorize('training.manage'))
  with check (user_id = auth.uid() or public.authorize('training.manage'));

create policy stage_progress_read on public.journey_stage_progress
  for select to authenticated
  using (public.authorize('training.manage')
         or exists (select 1 from public.journey_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));
create policy stage_progress_write on public.journey_stage_progress
  for all to authenticated
  using (public.authorize('training.manage')
         or exists (select 1 from public.journey_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()))
  with check (public.authorize('training.manage')
         or exists (select 1 from public.journey_enrollments e where e.id = enrollment_id and e.user_id = auth.uid()));

create policy candidates_rw on public.candidates
  for all to authenticated using (public.authorize('hiring.manage')) with check (public.authorize('hiring.manage'));
create policy interviews_rw on public.interviews
  for all to authenticated using (public.authorize('hiring.manage')) with check (public.authorize('hiring.manage'));
create policy offer_templates_rw on public.offer_templates
  for all to authenticated using (public.authorize('hiring.manage')) with check (public.authorize('hiring.manage'));
create policy offers_rw on public.offers
  for all to authenticated using (public.authorize('hiring.manage')) with check (public.authorize('hiring.manage'));

-- Timesheets/leave: a user manages their own; approvers manage all.
create policy timesheets_self on public.timesheets
  for all to authenticated
  using (user_id = auth.uid() or public.authorize('approvals.manage'))
  with check (user_id = auth.uid() or public.authorize('approvals.manage'));
create policy leave_self on public.leave_requests
  for all to authenticated
  using (user_id = auth.uid() or public.authorize('approvals.manage'))
  with check (user_id = auth.uid() or public.authorize('approvals.manage'));
