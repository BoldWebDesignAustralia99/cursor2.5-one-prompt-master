import { useIntegrations } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/status-dot";
import { Badge } from "@/components/ui/badge";

const runLogs = [
  { source: "workflow:Low balance nudge", level: "info", message: "Ran for clinic-southbank — email sent", at: "2m ago" },
  { source: "cron:gumbo_touch_capacity", level: "info", message: "Capacity cache refreshed (12 clinics)", at: "13m ago" },
  { source: "edge:gocardless-webhook", level: "warn", message: "Payment retrying for clinic-bondi", at: "31m ago" },
  { source: "edge:twilio-voice", level: "info", message: "Inbound call routed via forwarding rule", at: "1h ago" },
];

export function SystemHealthPage() {
  const { data: integrations } = useIntegrations();
  return (
    <PageBody>
      <PageHeader title="System health" description="Integrations, run logs, and the audit stream. Access here is logged." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(integrations ?? []).map((i) => (
          <Card key={i.key}>
            <CardContent className="flex items-center justify-between p-4">
              <span className="text-sm font-medium">{i.name}</span>
              <StatusDot tone={i.status === "ok" ? "positive" : i.status === "degraded" ? "attention" : i.status === "down" ? "negative" : "neutral"} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Run logs</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {runLogs.map((l, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <Badge variant={l.level === "warn" ? "attention" : "outline"}>{l.level}</Badge>
                <div>
                  <p className="font-mono text-xs">{l.source}</p>
                  <p className="text-sm">{l.message}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{l.at}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageBody>
  );
}
