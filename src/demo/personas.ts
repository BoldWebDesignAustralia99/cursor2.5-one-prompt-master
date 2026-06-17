import type { MeContext, RoleKey } from "@/lib/types";

/** The full permission catalogue (mirrors supabase/seed.sql). */
export const ALL_PERMISSION_KEYS = [
  "dashboard.view", "staff.view", "staff.manage", "permissions.manage",
  "activities.view", "activities.write", "comms.view", "comms.send",
  "custom_fields.manage", "custom_fields.write", "settings.manage",
  "pipelines.view", "pipelines.manage", "clinics.view", "clinics.manage",
  "leads.view", "leads.manage", "leads.call", "marketing.view", "marketing.manage",
  "routing.manage", "bookings.view", "bookings.manage", "classification.manage",
  "classification.review", "billing.view", "billing.manage", "telephony.use",
  "telephony.manage", "calls.monitor", "grading.view", "grading.review",
  "grading.manage", "coaching.manage", "workflows.view", "workflows.manage",
  "notifications.manage", "training.view", "training.manage", "hiring.manage",
  "approvals.manage", "flags.manage", "system.view", "system.manage",
  "followup.view", "followup.manage", "templates.manage",
] as const;

/** Role → permission defaults (mirrors supabase/seed.sql role_permissions). */
export const ROLE_PERMS: Record<RoleKey, string[]> = {
  super_admin: [...ALL_PERMISSION_KEYS],
  sales_rep: [
    "dashboard.view", "leads.call", "comms.send", "telephony.use",
    "custom_fields.write", "training.view",
  ],
  followup_rep: [
    "dashboard.view", "leads.call", "comms.send", "telephony.use", "training.view",
    "followup.view", "followup.manage", "bookings.view", "pipelines.view",
    "custom_fields.write",
  ],
  sales_manager: [
    "dashboard.view", "leads.view", "comms.view", "comms.send", "activities.view",
    "telephony.use", "calls.monitor", "bookings.view", "bookings.manage",
    "grading.view", "grading.review", "coaching.manage", "classification.review",
    "training.view", "training.manage", "hiring.manage", "approvals.manage",
    "pipelines.view", "custom_fields.write",
  ],
  marketing: [
    "dashboard.view", "marketing.view", "marketing.manage", "leads.view",
    "activities.view", "workflows.view", "workflows.manage", "templates.manage",
    "routing.manage", "pipelines.view",
  ],
  developer: [
    "dashboard.view", "system.view", "system.manage", "workflows.view",
    "workflows.manage", "flags.manage", "settings.manage", "activities.view",
    "templates.manage", "notifications.manage",
  ],
  // Clinic roles hold no global keys — access is entirely RLS clinic-scoped.
  clinic_admin: [],
  clinic_staff: [],
};

export interface DemoPersona extends MeContext {
  id: string;
  label: string;
  blurb: string;
}

function persona(
  id: string,
  full_name: string,
  role: RoleKey,
  label: string,
  blurb: string,
  clinic_ids: string[] = [],
): DemoPersona {
  return {
    id,
    label,
    blurb,
    is_super_admin: role === "super_admin",
    roles: [role],
    permissions: ROLE_PERMS[role],
    clinic_ids,
    profile: {
      id,
      full_name,
      email: `${id}@gumbo.demo`,
      avatar_url: null,
      phone: null,
      region: "AU",
      timezone: "Australia/Brisbane",
      is_active: true,
      primary_role: role,
      last_seen_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };
}

export const DEMO_PERSONAS: DemoPersona[] = [
  persona("owner", "Alex Owner", "super_admin", "Super admin", "Runs the whole machine — finances, performance, clinics."),
  persona("rep", "Sam Rep", "sales_rep", "Sales rep", "Works the call queue; books patients + deposits."),
  persona("manager", "Jordan Manager", "sales_manager", "Sales manager", "Coaching, grading, hiring, the floor."),
  persona("followup", "Casey Closer", "followup_rep", "Post-appointment rep", "Closes treatment sales after the consult."),
  persona("clinic", "Robin Front-desk", "clinic_admin", "Clinic admin", "Calendars, bookings, credits.", ["clinic-moorooka", "clinic-southbank"]),
  persona("marketing", "Morgan Ads", "marketing", "Marketing", "Ad analytics + follow-up workflows. No calling."),
  persona("dev", "Dev Patel", "developer", "Developer", "System health, workflows, feature flags. No calling."),
];

export const DEFAULT_PERSONA_ID = "owner";
