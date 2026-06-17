import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, PhoneCall, Users, Building2, CalendarDays, Workflow,
  BadgeDollarSign, BarChart3, ShieldCheck, Settings, Bell, MessageSquare,
  GraduationCap, ClipboardCheck, UserPlus, Megaphone, ServerCog, Gauge,
  ListChecks, Sparkles, FlaskConical, Trophy, Clock, CheckSquare, Users2,
} from "lucide-react";
import type { RoleKey, MeContext } from "@/lib/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Permission required to see this item (super_admin always passes). */
  perm?: string;
  /** If set, restrict to these roles in addition to any permission check. */
  roles?: RoleKey[];
  /** Show in the mobile bottom bar (max ~5 across the app). */
  mobile?: boolean;
  group: "Work" | "Operate" | "People" | "System";
}

export const NAV_ITEMS: NavItem[] = [
  // Work
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view", group: "Work", mobile: true },
  { to: "/calls", label: "Call queue", icon: PhoneCall, perm: "leads.call", group: "Work", mobile: true },
  { to: "/followup", label: "Follow-up", icon: Sparkles, perm: "followup.view", group: "Work", mobile: true },
  { to: "/clinic", label: "My clinics", icon: Building2, roles: ["clinic_admin", "clinic_staff"], group: "Work", mobile: true },
  { to: "/messages", label: "Messages", icon: MessageSquare, perm: "comms.send", group: "Work" },
  { to: "/tasks", label: "Tasks", icon: CheckSquare, perm: "dashboard.view", group: "Work" },
  { to: "/bookings", label: "Bookings feed", icon: CalendarDays, perm: "bookings.view", group: "Operate", mobile: true },

  // Operate
  { to: "/leads", label: "Leads", icon: ListChecks, perm: "leads.view", group: "Operate" },
  { to: "/clinics", label: "Clinics", icon: Building2, perm: "clinics.view", group: "Operate" },
  { to: "/performance", label: "Performance", icon: BarChart3, perm: "dashboard.view", group: "Operate" },
  { to: "/finances", label: "Finances", icon: BadgeDollarSign, perm: "billing.view", group: "Operate" },
  { to: "/marketing", label: "Marketing", icon: Megaphone, perm: "marketing.view", group: "Operate" },

  // People
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, perm: "dashboard.view", group: "People" },
  { to: "/grading", label: "Grading", icon: Gauge, perm: "grading.review", group: "People" },
  { to: "/coaching", label: "Coaching", icon: Sparkles, perm: "coaching.manage", group: "People" },
  { to: "/training", label: "Training", icon: GraduationCap, perm: "training.view", group: "People" },
  { to: "/hiring", label: "Hiring", icon: UserPlus, perm: "hiring.manage", group: "People" },
  { to: "/approvals", label: "Approvals", icon: ClipboardCheck, perm: "approvals.manage", group: "People" },
  { to: "/timesheets", label: "Timesheets", icon: Clock, perm: "dashboard.view", group: "People" },
  { to: "/community", label: "Community", icon: Users2, perm: "dashboard.view", group: "People" },
  { to: "/staff", label: "Staff & access", icon: Users, perm: "staff.view", group: "People" },

  // System
  { to: "/workflows", label: "Workflows", icon: Workflow, perm: "workflows.view", group: "System" },
  { to: "/permissions", label: "Permissions", icon: ShieldCheck, perm: "permissions.manage", group: "System" },
  { to: "/system", label: "System health", icon: ServerCog, perm: "system.view", group: "System" },
  { to: "/flags", label: "Feature flags", icon: FlaskConical, perm: "flags.manage", group: "System" },
  { to: "/settings", label: "Settings", icon: Settings, perm: "settings.manage", group: "System" },
];

export const SECONDARY_ITEMS: NavItem[] = [
  { to: "/notifications", label: "Notifications", icon: Bell, perm: "dashboard.view", group: "Work" },
];

/** Routes a clinic-only user (no internal role) is allowed to see — the portal world. */
const CLINIC_ALLOWED = new Set(["/clinic", "/notifications", "/profile"]);

function isClinicOnly(ctx: MeContext): boolean {
  if (ctx.is_super_admin || ctx.roles.length === 0) return false;
  return ctx.roles.every((r) => r === "clinic_admin" || r === "clinic_staff");
}

/** Items the current user may see. */
export function visibleNav(items: NavItem[], ctx: MeContext | null): NavItem[] {
  if (!ctx) return [];
  // Clinic-side users are structurally scoped to the portal — no internal surfaces.
  if (isClinicOnly(ctx)) {
    return items.filter((item) => CLINIC_ALLOWED.has(item.to) || item.to === "/clinic");
  }
  return items.filter((item) => {
    if (ctx.is_super_admin) {
      // The owner sees everything except the clinic-only portal entry.
      return !(item.roles && item.roles.every((r) => r === "clinic_admin" || r === "clinic_staff"));
    }
    const roleOk = !item.roles || item.roles.some((r) => ctx.roles.includes(r));
    const permOk = !item.perm || ctx.permissions.includes(item.perm);
    if (item.roles && item.perm) return roleOk && permOk;
    if (item.roles) return roleOk;
    return permOk;
  });
}

/** Where a role lands after sign-in. */
export function homeRouteForRole(role: RoleKey | null): string {
  switch (role) {
    case "sales_rep": return "/calls";
    case "followup_rep": return "/followup";
    case "clinic_admin":
    case "clinic_staff": return "/clinic";
    case "marketing": return "/marketing";
    case "developer": return "/system";
    default: return "/dashboard";
  }
}
