-- ============================================================================
-- AI call grading (9.3), bookings sales-compliance check (9.4), coaching.
-- The grading rubric is versioned config; categories/weights/thresholds editable.
-- ============================================================================

create table public.call_grading_config (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  prompt      text not null default '',
  version     int not null default 1,
  is_active   boolean not null default false,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
-- Exactly one active version at a time.
create unique index grading_config_one_active on public.call_grading_config ((is_active)) where is_active;

create table public.grading_categories (
  id         uuid primary key default gen_random_uuid(),
  config_id  uuid not null references public.call_grading_config (id) on delete cascade,
  key        text not null,                 -- 'opening' | 'discovery' | 'urgency' | ...
  name       text not null,
  weight     numeric not null default 1,
  -- thresholds: { "poor": 0, "basic": 40, "good": 70, "exceptional": 90 }
  thresholds jsonb not null default '{}'::jsonb,
  sort_order int not null default 100,
  unique (config_id, key)
);

create type grade_status as enum ('auto', 'reviewed', 'disputed');

create table public.call_analysis_reports (
  id               uuid primary key default gen_random_uuid(),
  communication_id uuid references public.communications (id) on delete set null,
  call_session_id  uuid references public.call_sessions (id) on delete set null,
  booking_id       uuid references public.bookings (id) on delete set null,
  lead_id          uuid references public.leads (id) on delete set null,
  rep_id           uuid references public.profiles (id) on delete set null,
  config_version   int,
  overall_score    numeric,
  category_scores  jsonb not null default '{}'::jsonb,  -- {category_key: {score, band, rationale}}
  rationale        text,
  is_practice      boolean not null default false,      -- training/practice calls use same engine
  status           grade_status not null default 'auto',
  reviewed_by      uuid references public.profiles (id),
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index analysis_rep_idx     on public.call_analysis_reports (rep_id, created_at desc);
create index analysis_booking_idx on public.call_analysis_reports (booking_id);
create index analysis_status_idx  on public.call_analysis_reports (status, created_at desc);

-- Per-booking AI sales-compliance check (price / finance / deposit / discovery).
create table public.booking_compliance_checks (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null references public.bookings (id) on delete cascade,
  price_provided    boolean,
  finance_discussed boolean,
  deposit_explained boolean,
  discovery_complete boolean,
  next_step_set     boolean,
  flags             jsonb not null default '[]'::jsonb,   -- [{level:'red|amber', label}]
  rationale         text,
  created_at        timestamptz not null default now()
);
create index compliance_booking_idx on public.booking_compliance_checks (booking_id, created_at desc);

-- Coaching feedback + memory (did the rep implement previous feedback?).
create table public.coaching_feedback (
  id          uuid primary key default gen_random_uuid(),
  rep_id      uuid not null references public.profiles (id) on delete cascade,
  author_id   uuid references public.profiles (id) on delete set null,
  report_id   uuid references public.call_analysis_reports (id) on delete set null,
  booking_id  uuid references public.bookings (id) on delete set null,
  body        text not null,
  category_key text,
  is_ai_generated boolean not null default false,
  implemented boolean,
  created_at  timestamptz not null default now()
);
create index coaching_rep_idx on public.coaching_feedback (rep_id, created_at desc);

alter table public.call_grading_config       enable row level security;
alter table public.grading_categories         enable row level security;
alter table public.call_analysis_reports      enable row level security;
alter table public.booking_compliance_checks  enable row level security;
alter table public.coaching_feedback           enable row level security;

create policy grading_config_read on public.call_grading_config
  for select to authenticated using (public.authorize('grading.view'));
create policy grading_config_manage on public.call_grading_config
  for all to authenticated
  using (public.authorize('grading.manage')) with check (public.authorize('grading.manage'));

create policy grading_cats_read on public.grading_categories
  for select to authenticated using (public.authorize('grading.view'));
create policy grading_cats_manage on public.grading_categories
  for all to authenticated
  using (public.authorize('grading.manage')) with check (public.authorize('grading.manage'));

-- Reps see their own reports; reviewers/managers see all.
create policy analysis_read on public.call_analysis_reports
  for select to authenticated
  using (rep_id = auth.uid() or public.authorize('grading.review'));
create policy analysis_write on public.call_analysis_reports
  for all to authenticated
  using (public.authorize('grading.review')) with check (public.authorize('grading.review'));

create policy compliance_read on public.booking_compliance_checks
  for select to authenticated using (public.authorize('bookings.view'));
create policy compliance_write on public.booking_compliance_checks
  for all to authenticated
  using (public.authorize('grading.review')) with check (public.authorize('grading.review'));

create policy coaching_read on public.coaching_feedback
  for select to authenticated
  using (rep_id = auth.uid() or public.authorize('coaching.manage'));
create policy coaching_write on public.coaching_feedback
  for all to authenticated
  using (public.authorize('coaching.manage')) with check (public.authorize('coaching.manage'));
