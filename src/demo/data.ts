import type {
  Clinic, ClinicHealth, Practitioner, Lead, BookingEnriched, PipelineStage,
  PipelineItem, AppNotification, CreditPackage, Invoice, Payment, ClassificationClass,
  Workflow, WorkflowAction, WorkflowTrigger, Integration, Setting, MessageTemplate,
  CallAnalysisReport,   CoachingFeedback, Candidate, FollowUpOutcome, Communication,
} from "@/lib/types";
import type { Json } from "@/lib/database.types";

const now = Date.now();
const iso = (offsetMin: number) => new Date(now + offsetMin * 60_000).toISOString();
const day = (n: number) => new Date(now + n * 86_400_000).toISOString();

export const demoClinics: Clinic[] = [
  base("clinic-moorooka", "Moorooka Dental", "Moorooka", "QLD", -27.53, 153.02, 14, "active"),
  base("clinic-southbank", "South Bank Smiles", "South Brisbane", "QLD", -27.48, 153.02, 3, "active"),
  base("clinic-bondi", "Bondi Dental Co", "Bondi", "NSW", -33.89, 151.27, 0, "paused"),
  base("clinic-perth", "Perth Implant Centre", "Perth", "WA", -31.95, 115.86, 42, "active"),
];

function base(
  id: string, name: string, suburb: string, state: string,
  lat: number, lng: number, credits: number,
  stage: Clinic["lifecycle_stage"],
): Clinic {
  return {
    id, name, slug: id, region: "AU", timezone: "Australia/Brisbane",
    lifecycle_stage: stage, address_line: null, suburb, state, postcode: null,
    country: "Australia", latitude: lat, longitude: lng, phone: null, email: null,
    outbound_caller_id: null, pms_provider: null, pms_active: false,
    credit_balance: credits, low_balance_threshold: 5,
    is_paused_for_routing: credits <= 0, notes: null,
    created_at: day(-120), updated_at: iso(-30),
  };
}

export const demoClinicHealth: ClinicHealth[] = demoClinics.map((c) => ({
  id: c.id, name: c.name, region: c.region, lifecycle_stage: c.lifecycle_stage,
  credit_balance: c.credit_balance, low_balance_threshold: c.low_balance_threshold,
  is_paused_for_routing: c.is_paused_for_routing,
  credit_state: c.credit_balance <= 0 ? "zero" : c.credit_balance <= c.low_balance_threshold ? "low" : "healthy",
  bookings_today: c.id === "clinic-moorooka" ? 4 : c.id === "clinic-southbank" ? 2 : 0,
}));

export const demoPractitioners: Practitioner[] = [
  prac("prac-1", "clinic-moorooka", "Dr. Helen Park", "on_site"),
  prac("prac-2", "clinic-moorooka", "Dr. Omar Aziz", "visiting"),
  prac("prac-3", "clinic-southbank", "Dr. Lucy Tran", "on_site"),
  prac("prac-4", "clinic-perth", "Dr. Ravi Singh", "none"),
];
function prac(id: string, clinic_id: string, full_name: string, senior: Practitioner["senior"]): Practitioner {
  return { id, clinic_id, full_name, senior, is_active: true, profile_id: null, created_at: day(-90), updated_at: day(-1) };
}

export const demoLeads: Lead[] = [
  lead("lead-1", "Maria Gonzalez", "Sunnybank", "callback_scheduled", -20, "Upper & lower set", true, true),
  lead("lead-2", "Tom Whitfield", "Carindale", "new", null, "Single tooth, front", false, null),
  lead("lead-3", "Priya Nair", "Indooroopilly", "in_progress", null, "All-on-X both arches", true, true),
  lead("lead-4", "Greg Holloway", "Logan", "no_answer", 90, "Lower denture alternative", false, false),
  lead("lead-5", "Anita Roy", "Chermside", "new", null, "Cosmetic, veneers", false, null),
  lead("lead-6", "David Lin", "Toowong", "new", null, "Multiple implants", true, null),
];
function lead(
  id: string, full_name: string, suburb: string, status: Lead["status"],
  callbackOffsetMin: number | null, wants: string,
  pricing: boolean, finance: boolean | null,
): Lead {
  return {
    id, full_name, phone: "+61400000000", email: `${id}@demo.dev`, suburb,
    state: "QLD", postcode: null, region: "AU", latitude: -27.5, longitude: 153.0,
    source_id: null, status, enquiry_type: "implants",
    assigned_to: "rep", assigned_clinic_id: null, cadence_step: 1,
    next_callback_at: callbackOffsetMin === null ? null : iso(callbackOffsetMin),
    last_contacted_at: iso(-180), attempts: 1,
    pricing_provided: pricing, pricing_provided_at: pricing ? iso(-60) : null,
    finance_eligible: finance, finance_checked_at: finance === null ? null : iso(-55),
    broker_referral_at: null, dedupe_key: null,
    checklist: [], notes: null, metadata: { wants }, campaign_id: null,
    created_at: iso(-1440), updated_at: iso(-60),
  };
}

const complianceOk: Json = { price_provided: true, finance_discussed: true, deposit_explained: true };
const complianceGap: Json = { price_provided: false, finance_discussed: true, deposit_explained: true, flags: [{ level: "red", label: "No price mentioned" }] };

export const demoBookings: BookingEnriched[] = [
  bk("bk-1", "Maria Gonzalez", "clinic-moorooka", "Dr. Helen Park", "on_site", "showed", "paid", "all_on_x", "All-on-X", complianceOk, 30),
  bk("bk-2", "Priya Nair", "clinic-moorooka", "Dr. Omar Aziz", "visiting", "confirmed", "paid", "multi_implant", "Multiple implants", complianceOk, 180),
  bk("bk-3", "James O'Neil", "clinic-southbank", "Dr. Lucy Tran", "on_site", "scheduled", "pending", "single_implant", "Single implant", complianceGap, 1440),
  bk("bk-4", "Sandra Cole", "clinic-perth", "Dr. Ravi Singh", "none", "no_show", "refunded", "cosmetic_only", "Cosmetic only", complianceOk, -2880),
];
function bk(
  id: string, patient: string, clinic_id: string, prac: string,
  senior: NonNullable<BookingEnriched["practitioner_senior"]>,
  status: BookingEnriched["status"], deposit: BookingEnriched["deposit_status"],
  class_key: string, class_name: string, compliance: Json, schedOffsetMin: number,
): BookingEnriched {
  const clinic = demoClinics.find((c) => c.id === clinic_id)!;
  return {
    id, scheduled_at: iso(schedOffsetMin), status, deposit_status: deposit,
    deposit_amount_cents: 7500, deposit_currency: "AUD",
    is_billable: ["all_on_x", "multi_implant"].includes(class_key),
    class_key, class_name, ai_brief: `${patient} — ${class_name}. Wants to proceed soon; asked about finance.`,
    compliance, clinic_id, clinic_name: clinic.name, clinic_timezone: clinic.timezone,
    practitioner_id: null, practitioner_name: prac, practitioner_senior: senior,
    rep_id: "rep", rep_name: "Sam Rep", lead_id: "lead-1", patient_name: patient,
    patient_phone: "+61400000000", created_at: iso(schedOffsetMin - 120),
  };
}

export const demoFollowUpStages: PipelineStage[] = [
  stage("attended_f", "Attended", 10, "progress"),
  stage("plan", "Plan received", 20, "progress"),
  stage("following", "Following up", 30, "progress"),
  stage("finance", "Considering finance", 40, "attention"),
  stage("verbal", "Verbal yes", 50, "positive"),
  stage("won_f", "Won", 60, "positive", true),
  stage("lost_f", "Lost", 70, "negative", false, true),
];
function stage(key: string, name: string, sort: number, tone: string, won = false, lost = false): PipelineStage {
  return {
    id: `fu-${key}`, pipeline_id: "follow_up", key, name, sort_order: sort,
    is_won: won, is_lost: lost, is_terminal: won || lost, tone, target: {}, created_at: day(-30),
  };
}

export const demoFollowUpItems: PipelineItem[] = [
  fu("fu-1", "Maria Gonzalez · Moorooka", "verbal", 1_850_000, 2),
  fu("fu-2", "Priya Nair · Moorooka", "finance", 3_200_000, 5),
  fu("fu-3", "Daniel Mert · South Bank", "following", 1_200_000, 6),
  fu("fu-4", "Liu Wang · Perth", "plan", 2_400_000, 1),
  fu("fu-5", "Erin Black · Moorooka", "attended_f", 900_000, 0),
];
function fu(id: string, title: string, stageKey: string, value: number, daysSince: number): PipelineItem {
  return {
    id, pipeline_id: "follow_up", stage_id: `fu-${stageKey}`, entity_kind: "lead",
    entity_id: id, owner_id: "followup", title, value_cents: value, currency: "AUD",
    priority: value / 1000 - daysSince, entered_stage_at: day(-daysSince),
    last_activity_at: day(-Math.min(daysSince, 1)), next_action_at: daysSince > 4 ? iso(120) : null,
    metadata: { days_since: daysSince }, created_at: day(-daysSince - 1), updated_at: day(0),
  };
}

export const demoNotifications: AppNotification[] = [
  notif("n-1", "Casey Closer", "clinic.low_balance", "South Bank Smiles low on credits", "3 credits remaining — nudge queued by a workflow.", "clinic", "clinic-southbank"),
  notif("n-2", "Sam Rep", "callback.due", "Callback due: Maria Gonzalez", "Scheduled for 20 minutes from now.", "lead", "lead-1"),
  notif("n-3", "Jordan Manager", "classification.review_requested", "Reclassification requested", "Booking bk-3 — proposed All-on-X.", "booking", "bk-3"),
];
function notif(id: string, _to: string, event: string, title: string, body: string, link_kind: string, link_id: string): AppNotification {
  return {
    id, recipient_id: "owner", event_key: event, title, body, link_kind, link_id,
    is_read: false, read_at: null, channel_results: {}, created_at: iso(-90),
  };
}

export const demoCreditPackages: CreditPackage[] = [
  { id: "pk-1", name: "Starter — 10 credits", credits: 10, price_cents: 150000, currency: "AUD", region: "AU", target_billable_bookings: 10, clinic_id: null, is_active: true, created_at: day(-200) },
  { id: "pk-2", name: "Growth — 25 credits", credits: 25, price_cents: 350000, currency: "AUD", region: "AU", target_billable_bookings: 25, clinic_id: null, is_active: true, created_at: day(-200) },
  { id: "pk-3", name: "Scale — 50 credits", credits: 50, price_cents: 650000, currency: "AUD", region: "AU", target_billable_bookings: 50, clinic_id: null, is_active: true, created_at: day(-200) },
];

export const demoInvoices: Invoice[] = [
  { id: "in-1", clinic_id: "clinic-moorooka", number: "GC-2026-0001", status: "paid", amount_cents: 350000, tax_cents: 31818, currency: "AUD", pdf_url: null, payment_id: "pay-1", issued_at: day(-12), due_at: day(-5), paid_at: day(-11), xero_ref: null, metadata: {}, created_at: day(-12), updated_at: day(-11) },
  { id: "in-2", clinic_id: "clinic-southbank", number: "GC-2026-0002", status: "issued", amount_cents: 150000, tax_cents: 13636, currency: "AUD", pdf_url: null, payment_id: null, issued_at: day(-2), due_at: day(5), paid_at: null, xero_ref: null, metadata: {}, created_at: day(-2), updated_at: day(-2) },
];

export const demoPayments: Payment[] = [
  { id: "pay-1", kind: "credit_purchase", provider: "gocardless", provider_ref: "GC123", clinic_id: "clinic-moorooka", lead_id: null, booking_id: null, amount_cents: 350000, currency: "AUD", status: "succeeded", failure_reason: null, metadata: {}, created_at: day(-11), updated_at: day(-11) },
  { id: "pay-2", kind: "patient_deposit", provider: "stripe", provider_ref: "pi_123", clinic_id: "clinic-moorooka", lead_id: "lead-1", booking_id: "bk-1", amount_cents: 7500, currency: "AUD", status: "succeeded", failure_reason: null, metadata: {}, created_at: iso(-90), updated_at: iso(-90) },
  { id: "pay-3", kind: "credit_purchase", provider: "gocardless", provider_ref: "GC124", clinic_id: "clinic-bondi", lead_id: null, booking_id: null, amount_cents: 150000, currency: "AUD", status: "failed", failure_reason: "Insufficient funds — retrying", metadata: {}, created_at: day(-1), updated_at: iso(-30) },
];

export const demoClasses: ClassificationClass[] = [
  cls("multi_implant", "Multiple implants", true, 10),
  cls("all_on_x", "All-on-X", true, 20),
  cls("single_implant", "Single implant", false, 30),
  cls("cosmetic_only", "Cosmetic only", false, 40),
  cls("unknown", "Unknown", false, 99),
];
function cls(key: string, name: string, is_billable: boolean, sort_order: number): ClassificationClass {
  return { key, name, is_billable, sort_order, created_at: day(-200), updated_at: day(-200) };
}

export const demoWorkflowTriggers: WorkflowTrigger[] = [
  { key: "booking.outcome_showed", name: "Booking outcome: showed", domain: "Bookings", description: null, payload_schema: {}, created_at: day(-30) },
  { key: "lead.no_answer", name: "Lead no-answer", domain: "Leads", description: null, payload_schema: {}, created_at: day(-30) },
  { key: "clinic.low_balance", name: "Clinic low balance", domain: "Clinics/Billing", description: null, payload_schema: {}, created_at: day(-30) },
];
export const demoWorkflowActions: WorkflowAction[] = [
  { key: "sms.send", name: "Send SMS", domain: "Comms", description: null, config_schema: {}, is_terminal: false, created_at: day(-30) },
  { key: "pipeline.move_stage", name: "Move pipeline stage", domain: "Pipelines", description: null, config_schema: {}, is_terminal: false, created_at: day(-30) },
  { key: "notification.send", name: "Send notification", domain: "Team", description: null, config_schema: {}, is_terminal: false, created_at: day(-30) },
  { key: "flow.wait", name: "Wait / delay", domain: "Flow", description: null, config_schema: {}, is_terminal: false, created_at: day(-30) },
];
export const demoWorkflows: Workflow[] = [
  { id: "wf-1", name: "Showed → enter follow-up", description: "When a booking outcome is showed, create the follow-up pipeline item and nudge.", trigger_key: "booking.outcome_showed", condition_group_id: null, status: "active", version: 3, created_by: "owner", created_at: day(-40), updated_at: day(-2) },
  { id: "wf-2", name: "No-answer re-engagement (7d)", description: "Re-engage no-answer leads after 7 days with an SMS.", trigger_key: "lead.no_answer", condition_group_id: null, status: "draft", version: 1, created_by: "marketing", created_at: day(-6), updated_at: day(-1) },
  { id: "wf-3", name: "Low balance nudge", description: "Email clinic + alert admin when credits are low.", trigger_key: "clinic.low_balance", condition_group_id: null, status: "active", version: 2, created_by: "owner", created_at: day(-30), updated_at: day(-10) },
];

export const demoIntegrations: Integration[] = [
  intg("twilio", "Twilio", "ok"), intg("stripe", "Stripe", "ok"),
  intg("gocardless", "GoCardless", "degraded"), intg("resend", "Resend", "ok"),
  intg("pms", "PMS", "ok"),
];
function intg(key: string, name: string, status: Integration["status"]): Integration {
  return { key, name, status, last_checked_at: iso(-5), detail: status === "degraded" ? { note: "1 payment retrying" } : {}, updated_at: iso(-5) };
}

export const demoSettings: Setting[] = [
  { key: "finance_check", value: { income_threshold_low: 50000, income_threshold_high: 75000, treatment_bracket_cents: 1800000 }, category: "finance", description: "Finance eligibility thresholds.", updated_by: null, updated_at: day(-30) },
  { key: "deposit", value: { amount_cents: 7500, currency: "AUD", refundable: true }, category: "bookings", description: "Refundable deposit (the $75 hold).", updated_by: null, updated_at: day(-30) },
  { key: "low_balance", value: { default_threshold: 5 }, category: "billing", description: "Default low-credit threshold.", updated_by: null, updated_at: day(-30) },
];

export const demoTemplates: MessageTemplate[] = [
  tpl("welcome_sms", "Welcome SMS", "lifecycle", "Hi {{first_name}}, thanks for your enquiry with Dental Group! When is a good time to chat?"),
  tpl("before_after_photos", "Before/after photos", "call_flow", "Here are before & after results from our clinics: {{link}}"),
  tpl("bone_loss_explainer", "Bone-loss explainer", "call_flow", "Quick explainer on bone resorption: {{link}}"),
  tpl("finance_options", "Finance options", "call_flow", "Here are the finance options we discussed, {{first_name}}: {{link}}"),
];
function tpl(key: string, name: string, category: string, body: string): MessageTemplate {
  return { id: key, key, name, channel: "sms", category, subject: null, body, variables: [], is_active: true, created_at: day(-60), updated_at: day(-60) };
}

export const demoAnalysisReports: CallAnalysisReport[] = [
  { id: "ar-1", communication_id: null, call_session_id: null, booking_id: "bk-3", lead_id: "lead-3", rep_id: "rep", config_version: 1, overall_score: 62, category_scores: { opening: { score: 80, band: "good" }, discovery: { score: 45, band: "basic" }, close: { score: 40, band: "basic", rationale: "Price not clearly stated" } }, rationale: "Strong open, thin discovery, price never quoted.", is_practice: false, status: "auto", reviewed_by: null, reviewed_at: null, created_at: iso(-200) },
  { id: "ar-2", communication_id: null, call_session_id: null, booking_id: "bk-1", lead_id: "lead-1", rep_id: "rep", config_version: 1, overall_score: 88, category_scores: { opening: { score: 90, band: "exceptional" }, discovery: { score: 85, band: "good" }, close: { score: 90, band: "exceptional" } }, rationale: "Excellent across the board.", is_practice: false, status: "reviewed", reviewed_by: "manager", reviewed_at: iso(-100), created_at: iso(-260) },
];

export const demoCoaching: CoachingFeedback[] = [
  { id: "cf-1", rep_id: "rep", author_id: "manager", report_id: "ar-1", booking_id: "bk-3", body: "Always state the price before moving to the booking step — you skipped it on this call.", category_key: "close", is_ai_generated: false, implemented: false, created_at: iso(-120) },
];

export const demoCandidates: Candidate[] = [
  { id: "cand-1", full_name: "Tia Brooks", email: "tia@demo.dev", phone: null, status: "interview", source: "Seek", resume_url: null, scorecard: {}, created_at: day(-9), updated_at: day(-1) },
  { id: "cand-2", full_name: "Mehmet Yilmaz", email: "mehmet@demo.dev", phone: null, status: "offer", source: "Referral", resume_url: null, scorecard: { overall: 8.5 }, created_at: day(-14), updated_at: day(-2) },
];

export const demoFollowUpOutcomes: FollowUpOutcome[] = [
  { id: "fo-1", lead_id: "lead-1", pipeline_item_id: "fu-1", clinic_id: "clinic-moorooka", rep_id: "followup", result: "won", treatment_value_cents: 1_850_000, fee_cents: 92_500, currency: "AUD", reason: null, attributed_at: day(-3), created_at: day(-3) },
  { id: "fo-2", lead_id: "lead-9", pipeline_item_id: null, clinic_id: "clinic-perth", rep_id: "followup", result: "lost", treatment_value_cents: 0, fee_cents: 0, currency: "AUD", reason: "Chose another provider", attributed_at: day(-5), created_at: day(-5) },
];

export const demoTimeline: Communication[] = [
  comm("c-1", "call", "outbound", "Outbound call — 6m 12s. Discussed All-on-X, stacked free-consult value.", -260),
  comm("c-2", "sms", "outbound", "Sent: before/after photos.", -240),
  comm("c-3", "sms", "inbound", "Patient: \"Looks great, what's the cost?\"", -200),
  comm("c-4", "internal_note", "internal", "AI note: patient highly motivated, asked about finance twice.", -180),
];
function comm(id: string, channel: Communication["channel"], direction: Communication["direction"], body: string, offsetMin: number): Communication {
  return {
    id, channel, direction, status: "completed", occurred_at: iso(offsetMin),
    entity_kind: "lead", entity_id: "lead-1", secondary_kind: null, secondary_id: null,
    author_id: "rep", from_address: null, to_address: null, subject: null, body,
    duration_seconds: channel === "call" ? 372 : null, media: {}, external_id: null,
    template_key: null, metadata: {}, created_at: iso(offsetMin), updated_at: iso(offsetMin),
  };
}

// ---- Aggregates (mirror the server RPCs) -----------------------------------

export function demoAdminOverview() {
  return {
    today: { bookings: 12, shows: 8, no_shows: 2, deposits_cents: 90000 },
    sales: { new_leads: 34, answered_call_rate: 0.72 },
    money: { revenue_cents: 500000, failed_payments: 1, invoices_issued: 2 },
    clinics: { active: 2, low: 1, zero: 1, paused: 1 },
    period: { from: day(0), to: day(0), region: null },
  };
}

export function demoFollowupOverview() {
  return {
    won: 1, lost: 1, revenue_closed_cents: 1_850_000, fees_cents: 92_500, conversion: 0.5,
  };
}

export const demoLeaderboard = [
  { rep_id: "rep", rep_name: "Sam Rep", bookings: 18, shows: 12, deposits_cents: 135000, avg_grade: 84, compliance_pass_rate: 0.83 },
  { rep_id: "rep-2", rep_name: "Dana Cole", bookings: 15, shows: 11, deposits_cents: 112500, avg_grade: 79, compliance_pass_rate: 0.74 },
  { rep_id: "rep-3", rep_name: "Kit Rowe", bookings: 11, shows: 6, deposits_cents: 82500, avg_grade: 71, compliance_pass_rate: 0.61 },
];
