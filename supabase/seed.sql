-- ============================================================================
-- Gumbo Connect v2 — CONFIG seed (safe to run on a real project).
-- Defines roles, the permission registry + role defaults, classification classes,
-- the grading rubric, pipelines + stages, workflow registries, notification
-- events, business-rule settings, templates, and lead custom fields.
-- Idempotent: re-running upserts. Demo business data lives in seed_demo.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
insert into public.roles (key, name, description, is_internal, has_calling_surface, sort_order) values
  ('super_admin',    'Super admin',         'Owner. Full access to the whole platform.',           true,  true,  10),
  ('sales_manager',  'Sales manager',       'Runs the sales floor; coaching, grading, hiring.',     true,  true,  20),
  ('sales_rep',      'Sales rep',           'Works the lead queue; books patients + deposits.',     true,  true,  30),
  ('followup_rep',   'Post-appointment rep','Closes treatment sales after the consult.',            true,  true,  40),
  ('marketing',      'Marketing',           'Runs ads/analytics + follow-up workflows. No calling.',true,  false, 50),
  ('developer',      'Developer',           'Builds/maintains the platform. No calling.',           true,  false, 60),
  ('clinic_admin',   'Clinic admin',        'Practice owner/manager: calendars, bookings, billing.',false, false, 70),
  ('clinic_staff',   'Clinic staff',        'Front desk: calendars, bookings, outcomes. No billing.',false, false, 80)
on conflict (key) do update set
  name = excluded.name, description = excluded.description,
  is_internal = excluded.is_internal, has_calling_surface = excluded.has_calling_surface,
  sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- Permission registry
-- ---------------------------------------------------------------------------
insert into public.permissions (key, name, domain, is_sensitive) values
  ('dashboard.view',          'View dashboards',          'general',        false),
  ('staff.view',              'View staff',               'staff',          false),
  ('staff.manage',            'Manage staff',             'staff',          true),
  ('permissions.manage',      'Manage permissions',       'security',       true),
  ('activities.view',         'View activity log',        'activities',     false),
  ('activities.write',        'Write activity log',       'activities',     false),
  ('comms.view',              'View communications',      'comms',          false),
  ('comms.send',              'Send communications',      'comms',          false),
  ('custom_fields.manage',    'Manage custom fields',     'config',         false),
  ('custom_fields.write',     'Edit custom field values', 'config',         false),
  ('settings.manage',         'Manage settings',          'config',         true),
  ('pipelines.view',          'View pipelines',           'pipelines',      false),
  ('pipelines.manage',        'Manage pipelines',         'pipelines',      false),
  ('clinics.view',            'View all clinics',         'clinics',        false),
  ('clinics.manage',          'Manage clinics',           'clinics',        false),
  ('leads.view',              'View all leads',           'leads',          false),
  ('leads.manage',            'Manage all leads',         'leads',          false),
  ('leads.call',              'Call leads',               'leads',          false),
  ('marketing.view',          'View marketing analytics', 'marketing',      false),
  ('marketing.manage',        'Manage marketing config',  'marketing',      false),
  ('routing.manage',          'Manage routing matrix',    'routing',        false),
  ('bookings.view',           'View all bookings',        'bookings',       false),
  ('bookings.manage',         'Manage all bookings',      'bookings',       false),
  ('classification.manage',   'Manage classification',    'classification', false),
  ('classification.review',   'Review classification',    'classification', false),
  ('billing.view',            'View billing',             'billing',        false),
  ('billing.manage',          'Manage billing',           'billing',        true),
  ('telephony.use',           'Use the softphone',        'telephony',      false),
  ('telephony.manage',        'Manage telephony',         'telephony',      false),
  ('calls.monitor',           'Monitor live calls',       'telephony',      false),
  ('grading.view',            'View grading',             'grading',        false),
  ('grading.review',          'Review/grade calls',       'grading',        false),
  ('grading.manage',          'Manage grading rubric',    'grading',        false),
  ('coaching.manage',         'Manage coaching',          'coaching',       false),
  ('workflows.view',          'View workflows',           'workflows',      false),
  ('workflows.manage',        'Manage workflows',         'workflows',      false),
  ('notifications.manage',    'Manage notification routing','notifications',false),
  ('training.view',           'View training',            'training',       false),
  ('training.manage',         'Author training',          'training',       false),
  ('hiring.manage',           'Manage hiring',            'hiring',         false),
  ('approvals.manage',        'Approve timesheets/leave', 'hr',             false),
  ('flags.manage',            'Manage feature flags',     'system',         false),
  ('system.view',             'View system health',       'system',         false),
  ('system.manage',           'Manage system/integrations','system',        true),
  ('followup.view',           'View follow-up sales',     'followup',       false),
  ('followup.manage',         'Manage follow-up sales',   'followup',       false),
  ('templates.manage',        'Manage templates',         'templates',      false)
on conflict (key) do update set
  name = excluded.name, domain = excluded.domain, is_sensitive = excluded.is_sensitive;

-- ---------------------------------------------------------------------------
-- Role → permission defaults. super_admin is granted implicitly (resolver bypass).
-- Clinic roles get only dashboard.view; their data access is RLS clinic-scoped.
-- ---------------------------------------------------------------------------
delete from public.role_permissions where role_key <> 'super_admin';

insert into public.role_permissions (role_key, permission_key, allowed)
select 'sales_rep', key, true from public.permissions where key in
  ('dashboard.view','leads.call','comms.send','telephony.use','custom_fields.write','training.view');

insert into public.role_permissions (role_key, permission_key, allowed)
select 'followup_rep', key, true from public.permissions where key in
  ('dashboard.view','leads.call','comms.send','telephony.use','training.view',
   'followup.view','followup.manage','bookings.view','pipelines.view','custom_fields.write');

insert into public.role_permissions (role_key, permission_key, allowed)
select 'sales_manager', key, true from public.permissions where key in
  ('dashboard.view','leads.view','comms.view','comms.send','activities.view',
   'telephony.use','calls.monitor','bookings.view','bookings.manage',
   'grading.view','grading.review','coaching.manage','classification.review',
   'training.view','training.manage','hiring.manage','approvals.manage','pipelines.view',
   'custom_fields.write');

insert into public.role_permissions (role_key, permission_key, allowed)
select 'marketing', key, true from public.permissions where key in
  ('dashboard.view','marketing.view','marketing.manage','leads.view','activities.view',
   'workflows.view','workflows.manage','templates.manage','routing.manage','pipelines.view');

insert into public.role_permissions (role_key, permission_key, allowed)
select 'developer', key, true from public.permissions where key in
  ('dashboard.view','system.view','system.manage','workflows.view','workflows.manage',
   'flags.manage','settings.manage','activities.view','templates.manage','notifications.manage');

insert into public.role_permissions (role_key, permission_key, allowed)
select 'clinic_admin', key, true from public.permissions where key in ('dashboard.view');
insert into public.role_permissions (role_key, permission_key, allowed)
select 'clinic_staff', key, true from public.permissions where key in ('dashboard.view');

-- ---------------------------------------------------------------------------
-- Classification classes (billable map; settings-editable later)
-- ---------------------------------------------------------------------------
insert into public.classification_classes (key, name, is_billable, sort_order) values
  ('multi_implant',  'Multiple implants', true,  10),
  ('all_on_x',       'All-on-X',          true,  20),
  ('single_implant', 'Single implant',    false, 30),
  ('cosmetic_only',  'Cosmetic only',     false, 40),
  ('unknown',        'Unknown',           false, 99)
on conflict (key) do update set name = excluded.name, is_billable = excluded.is_billable;

-- ---------------------------------------------------------------------------
-- Grading rubric (9.3): one active config + weighted categories
-- ---------------------------------------------------------------------------
insert into public.call_grading_config (id, name, prompt, version, is_active)
values ('00000000-0000-0000-0000-0000000000a1',
        'Default sales rubric v1',
        'Grade the call transcript against each category. Score 0-100 and band as poor/basic/good/exceptional with a short rationale. Strip staff names.',
        1, true)
on conflict (id) do nothing;

insert into public.grading_categories (config_id, key, name, weight, thresholds, sort_order) values
  ('00000000-0000-0000-0000-0000000000a1','opening',   'Opening & rapport',           1.0, '{"poor":0,"basic":40,"good":70,"exceptional":90}', 10),
  ('00000000-0000-0000-0000-0000000000a1','discovery', 'Discovery',                   1.5, '{"poor":0,"basic":40,"good":70,"exceptional":90}', 20),
  ('00000000-0000-0000-0000-0000000000a1','urgency',   'Urgency / emotional connection',1.2,'{"poor":0,"basic":40,"good":70,"exceptional":90}', 30),
  ('00000000-0000-0000-0000-0000000000a1','objection', 'Objection handling',          1.3, '{"poor":0,"basic":40,"good":70,"exceptional":90}', 40),
  ('00000000-0000-0000-0000-0000000000a1','close',     'Close & booking (price/finance/deposit)',2.0,'{"poor":0,"basic":40,"good":70,"exceptional":90}', 50)
on conflict (config_id, key) do nothing;

-- ---------------------------------------------------------------------------
-- Pipelines + stages (one engine, four configs — Feature 9.12)
-- ---------------------------------------------------------------------------
insert into public.pipelines (id, key, name, kind) values
  ('00000000-0000-0000-0000-0000000000b1','patient_booking',     'Patient booking',       'patient_booking'),
  ('00000000-0000-0000-0000-0000000000b2','clinic_acquisition',  'Clinic acquisition',    'clinic_acquisition'),
  ('00000000-0000-0000-0000-0000000000b3','follow_up',           'Post-appointment follow-up','follow_up'),
  ('00000000-0000-0000-0000-0000000000b4','training_onboarding', 'Onboarding',            'training_onboarding')
on conflict (key) do nothing;

insert into public.pipeline_stages (pipeline_id, key, name, sort_order, is_won, is_lost, is_terminal, tone) values
  -- patient_booking
  ('00000000-0000-0000-0000-0000000000b1','new',      'New',       10,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b1','working',  'Working',   20,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b1','booked',   'Booked',    30,false,false,false,'positive'),
  ('00000000-0000-0000-0000-0000000000b1','attended', 'Attended',  40,false,false,false,'positive'),
  ('00000000-0000-0000-0000-0000000000b1','won',      'Won',       50,true, false,true, 'positive'),
  ('00000000-0000-0000-0000-0000000000b1','lost',     'Lost',      60,false,true, true, 'negative'),
  -- clinic_acquisition
  ('00000000-0000-0000-0000-0000000000b2','prospect', 'Prospect',      10,false,false,false,'neutral'),
  ('00000000-0000-0000-0000-0000000000b2','proposal', 'Proposal sent', 20,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b2','signed',   'Signed',        30,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b2','onboarding','Onboarding',   40,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b2','active',   'Active',        50,true, false,true, 'positive'),
  ('00000000-0000-0000-0000-0000000000b2','lost_c',   'Lost',          60,false,true, true, 'negative'),
  -- follow_up
  ('00000000-0000-0000-0000-0000000000b3','attended_f','Attended',          10,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b3','plan',      'Plan received',     20,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b3','following', 'Following up',      30,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b3','finance',   'Considering finance',40,false,false,false,'attention'),
  ('00000000-0000-0000-0000-0000000000b3','verbal',    'Verbal yes',        50,false,false,false,'positive'),
  ('00000000-0000-0000-0000-0000000000b3','won_f',     'Won',               60,true, false,true, 'positive'),
  ('00000000-0000-0000-0000-0000000000b3','lost_f',    'Lost',              70,false,true, true, 'negative'),
  -- training_onboarding
  ('00000000-0000-0000-0000-0000000000b4','welcome',   'Welcome',           10,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b4','product',   'Product training',  20,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b4','drills',    'Script drills',     30,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b4','practice',  'Practice calls',    40,false,false,false,'progress'),
  ('00000000-0000-0000-0000-0000000000b4','live',      'Live',              50,true, false,true, 'positive')
on conflict (pipeline_id, key) do nothing;

-- ---------------------------------------------------------------------------
-- Workflow registries (9.9)
-- ---------------------------------------------------------------------------
insert into public.workflow_trigger_registry (key, name, domain) values
  ('lead.created',           'Lead created',              'Leads'),
  ('lead.no_answer',         'Lead no-answer',            'Leads'),
  ('call.completed',         'Call completed',            'Calls/Comms'),
  ('sms.received',           'SMS received',              'Calls/Comms'),
  ('booking.created',        'Booking created',           'Bookings'),
  ('booking.outcome_showed', 'Booking outcome: showed',   'Bookings'),
  ('booking.outcome_no_show','Booking outcome: no-show',  'Bookings'),
  ('clinic.low_balance',     'Clinic low balance',        'Clinics/Billing'),
  ('clinic.zero_balance',    'Clinic zero balance',       'Clinics/Billing'),
  ('payment.failed',         'Payment failed',            'Clinics/Billing'),
  ('classification.flipped', 'Classification flipped',    'Bookings'),
  ('followup.entered',       'Entered follow-up',         'Follow-up'),
  ('schedule.daily',         'Daily schedule',            'Schedule')
on conflict (key) do nothing;

insert into public.workflow_action_registry (key, name, domain, is_terminal) values
  ('sms.send',                  'Send SMS',               'Comms',    false),
  ('email.send',                'Send email',             'Comms',    false),
  ('task.create',               'Create task',            'Team',     false),
  ('lead.assign',               'Assign lead',            'Leads',    false),
  ('lead.reassign',             'Reassign lead',          'Leads',    false),
  ('stage.change',              'Change status',          'Leads',    false),
  ('note.add',                  'Add note',               'Comms',    false),
  ('callback.schedule',         'Schedule callback',      'Leads',    false),
  ('notification.send',         'Send notification',      'Team',     false),
  ('classification.request_review','Request reclassification','Bookings',false),
  ('clinic.pause',              'Pause clinic',           'Clinics',  false),
  ('clinic.resume',             'Resume clinic',          'Clinics',  false),
  ('invoice.generate',          'Generate invoice',       'Billing',  false),
  ('pipeline.move_stage',       'Move pipeline stage',    'Pipelines',false),
  ('webhook.call',              'Call webhook',           'System',   false),
  ('flow.wait',                 'Wait / delay',           'Flow',     false),
  ('flow.branch',               'Branch',                 'Flow',     false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Notification event types (9.10)
-- ---------------------------------------------------------------------------
insert into public.notification_event_types (key, name, domain, default_channels, is_urgent) values
  ('booking.created',               'New booking',             'Bookings',  '["in_app"]',          false),
  ('booking.rescheduled',           'Booking rescheduled',     'Bookings',  '["in_app"]',          false),
  ('booking.cancelled',             'Booking cancelled',       'Bookings',  '["in_app"]',          false),
  ('booking.brief_ready',           'Booking brief ready',     'Bookings',  '["in_app"]',          false),
  ('clinic.low_balance',            'Clinic low balance',      'Billing',   '["in_app","email"]',  true),
  ('payment.failed',                'Payment failed',          'Billing',   '["in_app","email"]',  true),
  ('callback.due',                  'Callback due',            'Leads',     '["in_app"]',          false),
  ('lead.replied',                  'Lead replied',            'Comms',     '["in_app"]',          false),
  ('coaching.received',             'Coaching feedback',       'Coaching',  '["in_app"]',          false),
  ('classification.review_requested','Reclassification requested','Classification','["in_app"]',   false),
  ('followup.entered',              'Patient entered follow-up','Follow-up','["in_app"]',          false),
  ('integration.failure',           'Integration failure',     'System',    '["in_app","email"]',  true),
  ('workflow.failed',               'Workflow failed',         'System',    '["in_app"]',          false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Business-rule settings (Architecture 01 §5 — no hardcoded rules)
-- ---------------------------------------------------------------------------
insert into public.settings (key, value, category, description) values
  ('finance_check', '{"income_threshold_low":50000,"income_threshold_high":75000,"treatment_bracket_cents":1800000}', 'finance', 'Finance eligibility thresholds (persona 04).'),
  ('deposit',       '{"amount_cents":7500,"currency":"AUD","refundable":true}', 'bookings', 'Refundable deposit (the $75 hold).'),
  ('low_balance',   '{"default_threshold":5}', 'billing', 'Default low-credit threshold.'),
  ('credit_refund_rules', '{"no_show":true,"clinic_caused":true,"cancelled":true}', 'billing', 'When a billable credit is refunded.'),
  ('cadence',       '{"steps":[{"after_hours":0},{"after_hours":4},{"after_hours":24},{"after_hours":72},{"after_hours":168}]}', 'queue', 'Callback cadence.'),
  ('excluded_locations', '[]', 'routing', 'Suburbs/postcodes excluded from routing.'),
  ('followup_eligibility', '{"min_value_cents":0,"require_clinic_opt_in":false,"classes":["multi_implant","all_on_x","single_implant"]}', 'followup', 'Which attended bookings enter follow-up.'),
  ('followup_fee', '{"rate":0.0}', 'followup', 'Commission rate to Dental Group on a won follow-up sale.'),
  ('ai_models', '{"primary":{"provider":"anthropic","model":"claude","temperature":0.2},"fallback":{"provider":"openai","model":"gpt"}}', 'ai', 'Anthropic primary, OpenAI fallback (Architecture 01 §6).')
on conflict (key) do update set value = excluded.value, description = excluded.description;

-- ---------------------------------------------------------------------------
-- Lead sources + a few message templates + lead custom fields
-- ---------------------------------------------------------------------------
insert into public.lead_sources (key, name, kind) values
  ('facebook', 'Facebook / Meta', 'facebook'),
  ('make',     'Make.com webhook', 'make'),
  ('csv',      'CSV import',       'csv'),
  ('manual',   'Manual entry',     'manual')
on conflict (key) do nothing;

insert into public.message_templates (key, name, channel, category, body) values
  ('welcome_sms',        'Welcome SMS',            'sms', 'lifecycle', 'Hi {{first_name}}, thanks for your enquiry with Dental Group! When is a good time to chat about your options?'),
  ('before_after_photos','Before/after photos',    'sms', 'call_flow', 'Here are some before & after results from our clinics: {{link}}'),
  ('bone_loss_explainer','Bone-loss explainer',    'sms', 'call_flow', 'Quick explainer on bone resorption and why timing matters: {{link}}'),
  ('finance_options',    'Finance options',        'sms', 'call_flow', 'Here are the finance options we discussed, {{first_name}}: {{link}}'),
  ('reminder_24h',       '24h appointment reminder','sms','reminder',  'Reminder: your consult at {{clinic_name}} is tomorrow at {{time}}. Reply C to confirm.')
on conflict (key) do nothing;

insert into public.custom_field_definitions (entity_kind, key, label, field_type, options, group_label, sort_order) values
  ('lead','wants',     'Wants',     'long_text', '[]', 'Lead facts', 10),
  ('lead','funding',   'Funding',   'select', '["Cash","Finance","Superannuation","Unsure"]', 'Lead facts', 20),
  ('lead','with_them', 'With them', 'text', '[]', 'Lead facts', 30)
on conflict (entity_kind, key) do nothing;

-- ---------------------------------------------------------------------------
-- Integrations health rows (so the health screen has something to render)
-- ---------------------------------------------------------------------------
insert into public.integrations (key, name, status) values
  ('twilio',     'Twilio',     'unknown'),
  ('stripe',     'Stripe',     'unknown'),
  ('gocardless', 'GoCardless', 'unknown'),
  ('resend',     'Resend',     'unknown'),
  ('pms',        'PMS',        'unknown')
on conflict (key) do nothing;
