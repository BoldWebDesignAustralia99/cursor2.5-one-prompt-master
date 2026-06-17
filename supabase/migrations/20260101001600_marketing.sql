-- ============================================================================
-- Marketing surfaces (persona 07A): campaigns + daily ad spend feed the
-- acquisition-efficiency analytics (cost-per-lead, cost-per-booked-lead).
-- ============================================================================

create table public.ad_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  platform    text not null default 'facebook',
  external_id text,
  source_id   uuid references public.lead_sources (id) on delete set null,
  region      region not null default 'AU',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index ad_campaigns_source_idx on public.ad_campaigns (source_id);

create table public.ad_spend_daily (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.ad_campaigns (id) on delete cascade,
  date        date not null,
  spend_cents bigint not null default 0,
  currency    text not null default 'AUD',
  impressions bigint,
  clicks      bigint,
  unique (campaign_id, date)
);
create index ad_spend_date_idx on public.ad_spend_daily (date);

-- Tie a lead back to the campaign that produced it (for revenue attribution).
alter table public.leads
  add column campaign_id uuid references public.ad_campaigns (id) on delete set null;
create index leads_campaign_idx on public.leads (campaign_id);

alter table public.ad_campaigns   enable row level security;
alter table public.ad_spend_daily enable row level security;

create policy ad_campaigns_read on public.ad_campaigns
  for select to authenticated using (public.authorize('marketing.view'));
create policy ad_campaigns_manage on public.ad_campaigns
  for all to authenticated using (public.authorize('marketing.manage')) with check (public.authorize('marketing.manage'));

create policy ad_spend_read on public.ad_spend_daily
  for select to authenticated using (public.authorize('marketing.view'));
create policy ad_spend_manage on public.ad_spend_daily
  for all to authenticated using (public.authorize('marketing.manage')) with check (public.authorize('marketing.manage'));
