/**
 * Database types for the Gumbo Connect v2 Postgres schema.
 *
 * Mirrors the repo migrations in `supabase/migrations/`. In a configured
 * environment, regenerate with `npm run db:types` (Supabase CLI). Hand-maintained
 * here so the typed `supabase` client + services compile before a project is
 * connected. Excluded from lint (see eslint.config.js).
 *
 * Insert/Update are modelled as Partial<Row> for the columns the app writes; the
 * server fills defaults/generated columns. This keeps the file readable while
 * remaining type-safe for the queries the services actually run.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type ViewDef<Row> = { Row: Row; Relationships: [] };

// ---- Row shapes ------------------------------------------------------------

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  region: "AU" | "USA";
  timezone: string;
  is_active: boolean;
  primary_role: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  key: string;
  name: string;
  description: string | null;
  is_internal: boolean;
  has_calling_surface: boolean;
  sort_order: number;
  created_at: string;
}

export interface PermissionRow {
  key: string;
  name: string;
  description: string | null;
  domain: string;
  is_sensitive: boolean;
  created_at: string;
}

export interface RolePermissionRow {
  role_key: string;
  permission_key: string;
  allowed: boolean;
}

export interface UserRoleRow {
  user_id: string;
  role_key: string;
  assigned_by: string | null;
  assigned_at: string;
}

export interface UserPermissionOverrideRow {
  user_id: string;
  permission_key: string;
  allowed: boolean;
  reason: string | null;
  set_by: string | null;
  set_at: string;
}

export interface ClinicRow {
  id: string;
  name: string;
  slug: string | null;
  region: "AU" | "USA";
  timezone: string;
  lifecycle_stage:
    | "prospect" | "proposal_sent" | "signed" | "onboarding" | "active" | "paused" | "churned";
  address_line: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  outbound_caller_id: string | null;
  pms_provider: string | null;
  pms_active: boolean;
  credit_balance: number;
  low_balance_threshold: number;
  is_paused_for_routing: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicMemberRow {
  clinic_id: string;
  user_id: string;
  member_role: "clinic_admin" | "clinic_staff";
  created_at: string;
}

export interface ClinicPractitionerRow {
  id: string;
  clinic_id: string;
  full_name: string;
  senior: "on_site" | "visiting" | "none";
  is_active: boolean;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  region: "AU" | "USA";
  latitude: number | null;
  longitude: number | null;
  source_id: string | null;
  status:
    | "new" | "in_progress" | "callback_scheduled" | "no_answer" | "booked"
    | "attended" | "not_interested" | "not_eligible" | "nurture" | "converted" | "lost";
  enquiry_type: string | null;
  assigned_to: string | null;
  assigned_clinic_id: string | null;
  cadence_step: number;
  next_callback_at: string | null;
  last_contacted_at: string | null;
  attempts: number;
  pricing_provided: boolean;
  pricing_provided_at: string | null;
  finance_eligible: boolean | null;
  finance_checked_at: string | null;
  broker_referral_at: string | null;
  dedupe_key: string | null;
  checklist: Json;
  notes: string | null;
  metadata: Json;
  campaign_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingRow {
  id: string;
  lead_id: string;
  clinic_id: string;
  practitioner_id: string | null;
  rep_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: "scheduled" | "confirmed" | "showed" | "no_show" | "cancelled" | "rescheduled";
  deposit_status: "none" | "pending" | "paid" | "refunded" | "failed";
  deposit_amount_cents: number;
  deposit_currency: string;
  deposit_payment_id: string | null;
  class_key: string | null;
  is_billable: boolean;
  classification_locked: boolean;
  ai_brief: string | null;
  compliance: Json;
  outcome_confirmed_at: string | null;
  outcome_by: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PipelineRow {
  id: string;
  key: string;
  name: string;
  kind: "patient_booking" | "clinic_acquisition" | "follow_up" | "training_onboarding";
  description: string | null;
  is_active: boolean;
  region: "AU" | "USA" | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineStageRow {
  id: string;
  pipeline_id: string;
  key: string;
  name: string;
  sort_order: number;
  is_won: boolean;
  is_lost: boolean;
  is_terminal: boolean;
  tone: string;
  target: Json;
  created_at: string;
}

export interface PipelineItemRow {
  id: string;
  pipeline_id: string;
  stage_id: string;
  entity_kind: string;
  entity_id: string;
  owner_id: string | null;
  title: string;
  value_cents: number;
  currency: string;
  priority: number;
  entered_stage_at: string;
  last_activity_at: string;
  next_action_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRow {
  id: string;
  channel: "call" | "sms" | "email" | "portal_message" | "internal_note";
  direction: "inbound" | "outbound" | "internal";
  status: string;
  occurred_at: string;
  entity_kind: string;
  entity_id: string;
  secondary_kind: string | null;
  secondary_id: string | null;
  author_id: string | null;
  from_address: string | null;
  to_address: string | null;
  subject: string | null;
  body: string | null;
  duration_seconds: number | null;
  media: Json;
  external_id: string | null;
  template_key: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ActivityRow {
  id: string;
  occurred_at: string;
  actor_id: string | null;
  actor_label: string | null;
  verb: string;
  entity_kind: string;
  entity_id: string;
  summary: string;
  metadata: Json;
  is_audit: boolean;
  region: "AU" | "USA" | null;
}

export interface NotificationRow {
  id: string;
  recipient_id: string;
  event_key: string | null;
  title: string;
  body: string | null;
  link_kind: string | null;
  link_id: string | null;
  is_read: boolean;
  read_at: string | null;
  channel_results: Json;
  created_at: string;
}

export interface SettingRow {
  key: string;
  value: Json;
  category: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

export interface FeatureFlagRow {
  key: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout: Json;
  updated_by: string | null;
  updated_at: string;
}

export interface IntegrationRow {
  key: string;
  name: string;
  status: "ok" | "degraded" | "down" | "unknown";
  last_checked_at: string | null;
  detail: Json;
  updated_at: string;
}

export interface CreditPackageRow {
  id: string;
  name: string;
  credits: number;
  price_cents: number;
  currency: string;
  region: "AU" | "USA";
  target_billable_bookings: number | null;
  clinic_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreditLedgerRow {
  id: string;
  clinic_id: string;
  delta: number;
  reason: string;
  balance_after: number;
  booking_id: string | null;
  payment_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  clinic_id: string;
  number: string;
  status: "draft" | "issued" | "paid" | "failed" | "void";
  amount_cents: number;
  tax_cents: number;
  currency: string;
  pdf_url: string | null;
  payment_id: string | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  xero_ref: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  kind: "patient_deposit" | "credit_purchase" | "follow_up_fee";
  provider: "stripe" | "gocardless" | "manual";
  provider_ref: string | null;
  clinic_id: string | null;
  lead_id: string | null;
  booking_id: string | null;
  amount_cents: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded" | "cancelled";
  failure_reason: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ClassificationClassRow {
  key: string;
  name: string;
  is_billable: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CallAnalysisReportRow {
  id: string;
  communication_id: string | null;
  call_session_id: string | null;
  booking_id: string | null;
  lead_id: string | null;
  rep_id: string | null;
  config_version: number | null;
  overall_score: number | null;
  category_scores: Json;
  rationale: string | null;
  is_practice: boolean;
  status: "auto" | "reviewed" | "disputed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CoachingFeedbackRow {
  id: string;
  rep_id: string;
  author_id: string | null;
  report_id: string | null;
  booking_id: string | null;
  body: string;
  category_key: string | null;
  is_ai_generated: boolean;
  implemented: boolean | null;
  created_at: string;
}

export interface WorkflowRow {
  id: string;
  name: string;
  description: string | null;
  trigger_key: string | null;
  condition_group_id: string | null;
  status: "draft" | "active" | "disabled";
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowActionRegistryRow {
  key: string;
  name: string;
  domain: string;
  description: string | null;
  config_schema: Json;
  is_terminal: boolean;
  created_at: string;
}

export interface WorkflowTriggerRegistryRow {
  key: string;
  name: string;
  domain: string;
  description: string | null;
  payload_schema: Json;
  created_at: string;
}

export interface WorkflowRunRow {
  id: string;
  workflow_id: string;
  version: number | null;
  entity_kind: string | null;
  entity_id: string | null;
  status: "running" | "succeeded" | "failed" | "cancelled" | "simulated";
  trigger_payload: Json;
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface MessageTemplateRow {
  id: string;
  key: string;
  name: string;
  channel: "call" | "sms" | "email" | "portal_message" | "internal_note";
  category: string | null;
  subject: string | null;
  body: string;
  variables: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlanRow {
  id: string;
  lead_id: string;
  booking_id: string | null;
  clinic_id: string | null;
  summary: string | null;
  quoted_value_cents: number;
  currency: string;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUpOutcomeRow {
  id: string;
  lead_id: string;
  pipeline_item_id: string | null;
  clinic_id: string | null;
  rep_id: string | null;
  result: "won" | "lost";
  treatment_value_cents: number;
  fee_cents: number;
  currency: string;
  reason: string | null;
  attributed_at: string;
  created_at: string;
}

export interface AvailabilityRow {
  id: string;
  clinic_id: string;
  practitioner_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityOverrideRow {
  id: string;
  clinic_id: string;
  practitioner_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CustomFieldDefinitionRow {
  id: string;
  entity_kind: string;
  key: string;
  label: string;
  field_type: string;
  options: Json;
  help_text: string | null;
  group_label: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TimesheetRow {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  status: "pending" | "approved" | "declined";
  approved_by: string | null;
  note: string | null;
  created_at: string;
}

export interface CandidateRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  source: string | null;
  resume_url: string | null;
  scorecard: Json;
  created_at: string;
  updated_at: string;
}

// ---- View shapes -----------------------------------------------------------

export interface BookingEnrichedRow {
  id: string;
  scheduled_at: string;
  status: BookingRow["status"];
  deposit_status: BookingRow["deposit_status"];
  deposit_amount_cents: number;
  deposit_currency: string;
  is_billable: boolean;
  class_key: string | null;
  class_name: string | null;
  ai_brief: string | null;
  compliance: Json;
  clinic_id: string | null;
  clinic_name: string | null;
  clinic_timezone: string | null;
  practitioner_id: string | null;
  practitioner_name: string | null;
  practitioner_senior: "on_site" | "visiting" | "none" | null;
  rep_id: string | null;
  rep_name: string | null;
  lead_id: string | null;
  patient_name: string | null;
  patient_phone: string | null;
  created_at: string;
}

export interface ClinicHealthRow {
  id: string;
  name: string;
  region: "AU" | "USA";
  lifecycle_stage: ClinicRow["lifecycle_stage"];
  credit_balance: number;
  low_balance_threshold: number;
  is_paused_for_routing: boolean;
  credit_state: "zero" | "low" | "healthy";
  bookings_today: number;
}

// ---- Database --------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      roles: TableDef<RoleRow>;
      permissions: TableDef<PermissionRow>;
      role_permissions: TableDef<RolePermissionRow>;
      user_roles: TableDef<UserRoleRow>;
      user_permission_overrides: TableDef<UserPermissionOverrideRow>;
      clinics: TableDef<ClinicRow>;
      clinic_members: TableDef<ClinicMemberRow>;
      clinic_practitioners: TableDef<ClinicPractitionerRow>;
      leads: TableDef<LeadRow>;
      bookings: TableDef<BookingRow>;
      pipelines: TableDef<PipelineRow>;
      pipeline_stages: TableDef<PipelineStageRow>;
      pipeline_items: TableDef<PipelineItemRow>;
      communications: TableDef<CommunicationRow>;
      activities: TableDef<ActivityRow>;
      notifications: TableDef<NotificationRow>;
      settings: TableDef<SettingRow>;
      feature_flags: TableDef<FeatureFlagRow>;
      integrations: TableDef<IntegrationRow>;
      credit_packages: TableDef<CreditPackageRow>;
      credit_ledger: TableDef<CreditLedgerRow>;
      invoices: TableDef<InvoiceRow>;
      payments: TableDef<PaymentRow>;
      classification_classes: TableDef<ClassificationClassRow>;
      call_analysis_reports: TableDef<CallAnalysisReportRow>;
      coaching_feedback: TableDef<CoachingFeedbackRow>;
      workflows: TableDef<WorkflowRow>;
      workflow_action_registry: TableDef<WorkflowActionRegistryRow>;
      workflow_trigger_registry: TableDef<WorkflowTriggerRegistryRow>;
      workflow_runs: TableDef<WorkflowRunRow>;
      message_templates: TableDef<MessageTemplateRow>;
      treatment_plans: TableDef<TreatmentPlanRow>;
      follow_up_outcomes: TableDef<FollowUpOutcomeRow>;
      clinic_staff_availability: TableDef<AvailabilityRow>;
      clinic_staff_availability_overrides: TableDef<AvailabilityOverrideRow>;
      custom_field_definitions: TableDef<CustomFieldDefinitionRow>;
      timesheets: TableDef<TimesheetRow>;
      candidates: TableDef<CandidateRow>;
    };
    Views: {
      v_bookings_enriched: ViewDef<BookingEnrichedRow>;
      v_clinic_health: ViewDef<ClinicHealthRow>;
    };
    Functions: {
      authorize: { Args: { p_perm: string }; Returns: boolean };
      admin_overview: {
        Args: { p_from?: string; p_to?: string; p_region?: string | null };
        Returns: Json;
      };
      rep_leaderboard: {
        Args: { p_from?: string; p_to?: string };
        Returns: {
          rep_id: string;
          rep_name: string;
          bookings: number;
          shows: number;
          deposits_cents: number;
          avg_grade: number | null;
          compliance_pass_rate: number | null;
        }[];
      };
      followup_overview: { Args: { p_from?: string; p_to?: string }; Returns: Json };
      move_pipeline_item: { Args: { p_item: string; p_stage: string }; Returns: undefined };
      apply_credit_movement: {
        Args: {
          p_clinic: string;
          p_delta: number;
          p_reason: string;
          p_booking?: string;
          p_payment?: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
