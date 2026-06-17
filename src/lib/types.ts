/** Friendly aliases for the database row types used across the app. */
import type {
  ProfileRow, RoleRow, PermissionRow, ClinicRow, ClinicPractitionerRow,
  LeadRow, BookingRow, PipelineRow, PipelineStageRow, PipelineItemRow,
  CommunicationRow, ActivityRow, NotificationRow, SettingRow, FeatureFlagRow,
  IntegrationRow, CreditPackageRow, CreditLedgerRow, InvoiceRow, PaymentRow,
  ClassificationClassRow, CallAnalysisReportRow, CoachingFeedbackRow,
  WorkflowRow, WorkflowActionRegistryRow, WorkflowTriggerRegistryRow, WorkflowRunRow,
  MessageTemplateRow, TreatmentPlanRow, FollowUpOutcomeRow, BookingEnrichedRow,
  ClinicHealthRow, CustomFieldDefinitionRow, CandidateRow, TimesheetRow,
} from "@/lib/database.types";

export type Profile = ProfileRow;
export type Role = RoleRow;
export type Permission = PermissionRow;
export type Clinic = ClinicRow;
export type Practitioner = ClinicPractitionerRow;
export type Lead = LeadRow;
export type Booking = BookingRow;
export type Pipeline = PipelineRow;
export type PipelineStage = PipelineStageRow;
export type PipelineItem = PipelineItemRow;
export type Communication = CommunicationRow;
export type Activity = ActivityRow;
export type AppNotification = NotificationRow;
export type Setting = SettingRow;
export type FeatureFlag = FeatureFlagRow;
export type Integration = IntegrationRow;
export type CreditPackage = CreditPackageRow;
export type CreditLedgerEntry = CreditLedgerRow;
export type Invoice = InvoiceRow;
export type Payment = PaymentRow;
export type ClassificationClass = ClassificationClassRow;
export type CallAnalysisReport = CallAnalysisReportRow;
export type CoachingFeedback = CoachingFeedbackRow;
export type Workflow = WorkflowRow;
export type WorkflowAction = WorkflowActionRegistryRow;
export type WorkflowTrigger = WorkflowTriggerRegistryRow;
export type WorkflowRun = WorkflowRunRow;
export type MessageTemplate = MessageTemplateRow;
export type TreatmentPlan = TreatmentPlanRow;
export type FollowUpOutcome = FollowUpOutcomeRow;
export type BookingEnriched = BookingEnrichedRow;
export type ClinicHealth = ClinicHealthRow;
export type CustomFieldDefinition = CustomFieldDefinitionRow;
export type Candidate = CandidateRow;
export type Timesheet = TimesheetRow;

export type RoleKey =
  | "super_admin" | "sales_manager" | "sales_rep" | "followup_rep"
  | "marketing" | "developer" | "clinic_admin" | "clinic_staff";

export interface MeContext {
  profile: Profile | null;
  roles: RoleKey[];
  permissions: string[];
  clinic_ids: string[];
  is_super_admin: boolean;
}
