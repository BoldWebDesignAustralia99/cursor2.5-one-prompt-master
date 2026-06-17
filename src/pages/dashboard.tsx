import { Link } from "react-router-dom";
import {
  TriangleAlert, ArrowUpRight, CreditCard, PhoneIncoming, CalendarCheck,
} from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { useAdminOverview, useClinicHealth, useLeaderboard, useFollowupOverview } from "@/services/queries";
import { PageBody, PageHeader, Stat, StatGrid, pct } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/status-dot";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/utils";

export function DashboardPage() {
  const { hasRole, ctx } = useAuth();
  const isManager = hasRole("sales_manager") && !ctx?.is_super_admin;
  return isManager ? <FloorDashboard /> : <CommandCenter />;
}

function CommandCenter() {
  const { data: o, isLoading } = useAdminOverview();
  const { data: clinics } = useClinicHealth();
  const { data: board } = useLeaderboard();
  const { data: fu } = useFollowupOverview();

  const lowClinics = (clinics ?? []).filter((c) => c.credit_state !== "healthy");

  return (
    <PageBody>
      <PageHeader
        title="Command Center"
        description="Is the machine healthy? Today at a glance, on one calm screen."
      />

      <StatGrid>
        <Stat label="Bookings today" value={o?.today.bookings ?? 0} loading={isLoading} sublabel="vs target" />
        <Stat label="Shows / no-shows" value={`${o?.today.shows ?? 0} / ${o?.today.no_shows ?? 0}`} loading={isLoading} tone="positive" />
        <Stat label="Deposits today" value={formatMoney(o?.today.deposits_cents)} loading={isLoading} />
        <Stat label="New leads" value={o?.sales.new_leads ?? 0} loading={isLoading} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Needs attention</CardTitle>
            <Badge variant="outline">deep-links to the record</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {(o?.money.failed_payments ?? 0) > 0 && (
              <AttentionRow
                tone="negative" icon={CreditCard}
                label={`${o?.money.failed_payments} failed payment — retrying`}
                to="/finances"
              />
            )}
            {lowClinics.map((c) => (
              <AttentionRow
                key={c.id}
                tone={c.credit_state === "zero" ? "negative" : "attention"}
                icon={TriangleAlert}
                label={`${c.name} — ${c.credit_state === "zero" ? "zero credits (paused)" : "low on credits"}`}
                to="/clinics"
              />
            ))}
            <AttentionRow tone="attention" icon={ArrowUpRight} label="Yesterday's cost-per-booking up 18%" to="/marketing" />
            {lowClinics.length === 0 && (o?.money.failed_payments ?? 0) === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Everything green. Nothing needs you right now.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Money this week</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Row label="Credit revenue" value={formatMoney(o?.money.revenue_cents)} />
            <Row label="Invoices issued" value={String(o?.money.invoices_issued ?? 0)} />
            <Row label="Answered-call rate" value={pct(o?.sales.answered_call_rate)} />
            <Row label="Follow-up revenue" value={formatMoney(fu?.revenue_closed_cents)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Clinic health</CardTitle>
            <Link to="/clinics" className="text-xs text-muted-foreground hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(clinics ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <StatusDot tone={c.credit_state === "healthy" ? "positive" : c.credit_state === "low" ? "attention" : "negative"} />
                  <span className="text-sm">{c.name}</span>
                </div>
                <span className="text-sm tabular text-muted-foreground">{c.credit_balance} credits</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sales leaderboard</CardTitle>
            <Link to="/performance" className="text-xs text-muted-foreground hover:underline">Performance</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {(board ?? []).map((r, i) => (
              <div key={r.rep_id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div className="flex items-center gap-3">
                  <span className="w-4 text-sm tabular text-muted-foreground">{i + 1}</span>
                  <span className="text-sm">{r.rep_name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm tabular">
                  <span>{r.bookings} booked</span>
                  <Badge variant={(r.compliance_pass_rate ?? 0) >= 0.8 ? "positive" : (r.compliance_pass_rate ?? 0) >= 0.7 ? "attention" : "negative"}>
                    {pct(r.compliance_pass_rate)} compliant
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}

function FloorDashboard() {
  const { data: o } = useAdminOverview();
  const { data: board } = useLeaderboard();
  return (
    <PageBody>
      <PageHeader title="Floor dashboard" description="Team pace, compliance, and the three things to coach today." />
      <StatGrid>
        <Stat label="Bookings today" value={o?.today.bookings ?? 0} />
        <Stat label="Shows" value={o?.today.shows ?? 0} tone="positive" />
        <Stat label="Answered-call rate" value={pct(o?.sales.answered_call_rate)} tone="progress" />
        <Stat label="On a call now" value={2} sublabel="live presence" />
      </StatGrid>

      <Card>
        <CardHeader><CardTitle>Compliance strip — price / finance / deposit</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(board ?? []).map((r) => (
            <div key={r.rep_id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{r.rep_name}</span>
                <span className="tabular text-muted-foreground">{pct(r.compliance_pass_rate)}</span>
              </div>
              <Progress
                value={(r.compliance_pass_rate ?? 0) * 100}
                indicatorClassName={
                  (r.compliance_pass_rate ?? 0) >= 0.8
                    ? "bg-[hsl(var(--positive))]"
                    : (r.compliance_pass_rate ?? 0) >= 0.7
                      ? "bg-[hsl(var(--attention))]"
                      : "bg-[hsl(var(--negative))]"
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <QuickLink to="/grading" icon={CalendarCheck} label="Grading review queue" />
        <QuickLink to="/bookings" icon={PhoneIncoming} label="Bookings feed + compliance" />
        <QuickLink to="/hiring" icon={ArrowUpRight} label="Hiring pipeline" />
      </div>
    </PageBody>
  );
}

function AttentionRow({
  tone, icon: Icon, label, to,
}: {
  tone: "negative" | "attention" | "positive";
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
}) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-accent/50">
      <div className="flex items-center gap-2.5">
        <StatusDot tone={tone} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}

function QuickLink({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-accent/50">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
