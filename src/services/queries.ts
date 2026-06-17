import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import * as demo from "@/demo/data";
import type {
  BookingEnriched, ClinicHealth, Lead, AppNotification, PipelineStage, PipelineItem,
  Clinic, Invoice, Payment, CreditPackage, ClassificationClass, Workflow, WorkflowAction,
  WorkflowTrigger, Integration, Setting, MessageTemplate, CallAnalysisReport,
  CoachingFeedback, Candidate, FollowUpOutcome, Communication,
} from "@/lib/types";

/**
 * Run a demo fixture when Supabase is unconfigured, otherwise the live query.
 * Keeps every screen clickable on the Vercel preview before a project is wired,
 * while the real path stays the single source of truth.
 */
function useData<T>(
  key: unknown[],
  demoValue: () => T,
  realFn: () => Promise<T>,
  options?: Partial<UseQueryOptions<T>>,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => (env.demoMode ? Promise.resolve(demoValue()) : realFn()),
    ...options,
  });
}

export function useAdminOverview() {
  return useData(["admin_overview"], demo.demoAdminOverview, async () => {
    const { data, error } = await supabase.rpc("admin_overview");
    if (error) throw error;
    return data as ReturnType<typeof demo.demoAdminOverview>;
  });
}

export function useFollowupOverview() {
  return useData(["followup_overview"], demo.demoFollowupOverview, async () => {
    const { data, error } = await supabase.rpc("followup_overview");
    if (error) throw error;
    return data as ReturnType<typeof demo.demoFollowupOverview>;
  });
}

export function useLeaderboard() {
  return useData(["rep_leaderboard"], () => demo.demoLeaderboard, async () => {
    const { data, error } = await supabase.rpc("rep_leaderboard");
    if (error) throw error;
    return data;
  });
}

export function useClinicHealth() {
  return useData<ClinicHealth[]>(["clinic_health"], () => demo.demoClinicHealth, async () => {
    const { data, error } = await supabase.from("v_clinic_health").select("*");
    if (error) throw error;
    return data;
  });
}

export function useClinics() {
  return useData<Clinic[]>(["clinics"], () => demo.demoClinics, async () => {
    const { data, error } = await supabase
      .from("clinics")
      .select("*")
      .order("name")
      .limit(50);
    if (error) throw error;
    return data;
  });
}

export function useBookingsFeed() {
  return useData<BookingEnriched[]>(["bookings_feed"], () => demo.demoBookings, async () => {
    const { data, error } = await supabase
      .from("v_bookings_enriched")
      .select("*")
      .order("scheduled_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  });
}

export function useCallQueue() {
  return useData<Lead[]>(["call_queue"], () => demo.demoLeads, async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .in("status", ["new", "in_progress", "callback_scheduled", "no_answer"])
      .order("next_callback_at", { ascending: true, nullsFirst: false })
      .limit(50);
    if (error) throw error;
    return data;
  });
}

export function useFollowUpBoard() {
  return useData<{ stages: PipelineStage[]; items: PipelineItem[] }>(
    ["followup_board"],
    () => ({ stages: demo.demoFollowUpStages, items: demo.demoFollowUpItems }),
    async () => {
      const [{ data: stages, error: e1 }, { data: items, error: e2 }] = await Promise.all([
        supabase.from("pipeline_stages").select("*").order("sort_order"),
        supabase.from("pipeline_items").select("*").order("priority", { ascending: false }).limit(200),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return { stages: stages ?? [], items: items ?? [] };
    },
  );
}

export function useNotifications() {
  return useData<AppNotification[]>(["notifications"], () => demo.demoNotifications, async () => {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  });
}

export function useInvoices() {
  return useData<Invoice[]>(["invoices"], () => demo.demoInvoices, async () => {
    const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  });
}

export function usePayments() {
  return useData<Payment[]>(["payments"], () => demo.demoPayments, async () => {
    const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  });
}

export function useCreditPackages() {
  return useData<CreditPackage[]>(["credit_packages"], () => demo.demoCreditPackages, async () => {
    const { data, error } = await supabase.from("credit_packages").select("*").eq("is_active", true);
    if (error) throw error;
    return data;
  });
}

export function useClasses() {
  return useData<ClassificationClass[]>(["classes"], () => demo.demoClasses, async () => {
    const { data, error } = await supabase.from("classification_classes").select("*").order("sort_order");
    if (error) throw error;
    return data;
  });
}

export function useWorkflows() {
  return useData<{ workflows: Workflow[]; actions: WorkflowAction[]; triggers: WorkflowTrigger[] }>(
    ["workflows"],
    () => ({ workflows: demo.demoWorkflows, actions: demo.demoWorkflowActions, triggers: demo.demoWorkflowTriggers }),
    async () => {
      const [{ data: workflows }, { data: actions }, { data: triggers }] = await Promise.all([
        supabase.from("workflows").select("*").order("updated_at", { ascending: false }),
        supabase.from("workflow_action_registry").select("*").order("domain"),
        supabase.from("workflow_trigger_registry").select("*").order("domain"),
      ]);
      return { workflows: workflows ?? [], actions: actions ?? [], triggers: triggers ?? [] };
    },
  );
}

export function useIntegrations() {
  return useData<Integration[]>(["integrations"], () => demo.demoIntegrations, async () => {
    const { data, error } = await supabase.from("integrations").select("*").order("name");
    if (error) throw error;
    return data;
  });
}

export function useSettings() {
  return useData<Setting[]>(["settings"], () => demo.demoSettings, async () => {
    const { data, error } = await supabase.from("settings").select("*").order("category");
    if (error) throw error;
    return data;
  });
}

export function useTemplates() {
  return useData<MessageTemplate[]>(["templates"], () => demo.demoTemplates, async () => {
    const { data, error } = await supabase.from("message_templates").select("*").eq("is_active", true);
    if (error) throw error;
    return data;
  });
}

export function useAnalysisReports() {
  return useData<CallAnalysisReport[]>(["analysis_reports"], () => demo.demoAnalysisReports, async () => {
    const { data, error } = await supabase.from("call_analysis_reports").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  });
}

export function useCoaching() {
  return useData<CoachingFeedback[]>(["coaching"], () => demo.demoCoaching, async () => {
    const { data, error } = await supabase.from("coaching_feedback").select("*").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  });
}

export function useCandidates() {
  return useData<Candidate[]>(["candidates"], () => demo.demoCandidates, async () => {
    const { data, error } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });
}

export function useFollowUpOutcomes() {
  return useData<FollowUpOutcome[]>(["followup_outcomes"], () => demo.demoFollowUpOutcomes, async () => {
    const { data, error } = await supabase.from("follow_up_outcomes").select("*").order("attributed_at", { ascending: false }).limit(50);
    if (error) throw error;
    return data;
  });
}

export function useLeadTimeline(_leadId: string) {
  return useData<Communication[]>(["lead_timeline", _leadId], () => demo.demoTimeline, async () => {
    const { data, error } = await supabase
      .from("communications")
      .select("*")
      .eq("entity_kind", "lead")
      .eq("entity_id", _leadId)
      .order("occurred_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  });
}
