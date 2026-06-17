import { useClinicHealth } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";

export function ClinicsAdminPage() {
  const { data } = useClinicHealth();
  return (
    <PageBody>
      <PageHeader title="Clinics" description="Every clinic — lifecycle stage, credit balance, and bookings — one row, one timeline." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.region}</p>
                </div>
                <Badge variant={c.lifecycle_stage === "active" ? "positive" : c.lifecycle_stage === "paused" ? "negative" : "outline"}>
                  {c.lifecycle_stage}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <StatusDot
                  tone={c.credit_state === "healthy" ? "positive" : c.credit_state === "low" ? "attention" : "negative"}
                  label={`${c.credit_balance} credits`}
                />
                <span className="tabular text-muted-foreground">{c.bookings_today} today</span>
              </div>
              {c.is_paused_for_routing ? <Badge variant="negative">Paused in routing</Badge> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}
