import * as React from "react";
import { useBookingsFeed } from "@/services/queries";
import { PageBody, PageHeader, ListSkeleton } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusDot } from "@/components/status-dot";
import { formatMoney } from "@/lib/utils";
import { Star } from "lucide-react";

type Flag = { level: string; label: string };

export function BookingsFeedPage() {
  const { data, isLoading } = useBookingsFeed();
  const [tab, setTab] = React.useState("all");

  const items = (data ?? []).filter((b) => {
    if (tab === "flagged") {
      const c = b.compliance as { flags?: Flag[] };
      return (c.flags?.length ?? 0) > 0;
    }
    if (tab === "today") return new Date(b.scheduled_at).toDateString() === new Date().toDateString();
    return true;
  });

  return (
    <PageBody>
      <PageHeader title="Bookings feed" description="Live booking stream with the AI sales-compliance check — price, finance, deposit." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="flagged">Flagged</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const c = b.compliance as { price_provided?: boolean; finance_discussed?: boolean; deposit_explained?: boolean; flags?: Flag[] };
            return (
              <Card key={b.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{b.patient_name}</p>
                      {b.is_billable ? <Badge variant="positive">{b.class_name}</Badge> : <Badge variant="outline">{b.class_name}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {b.clinic_name} · {b.practitioner_name}
                      {b.practitioner_senior === "on_site" && <span className="ml-1 inline-flex items-center gap-0.5"><Star className="h-3 w-3" /> senior</span>}
                      {" · "}{new Date(b.scheduled_at).toLocaleString()} · {b.rep_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-3 text-xs">
                      <CompliancePip ok={!!c.price_provided} label="Price" />
                      <CompliancePip ok={!!c.finance_discussed} label="Finance" />
                      <CompliancePip ok={!!c.deposit_explained} label="Deposit" />
                    </div>
                    <Badge variant={b.deposit_status === "paid" ? "positive" : b.deposit_status === "failed" ? "negative" : "attention"}>
                      {formatMoney(b.deposit_amount_cents)} {b.deposit_status}
                    </Badge>
                  </div>
                  {(c.flags?.length ?? 0) > 0 ? (
                    <div className="flex w-full flex-wrap gap-1.5 border-t border-border pt-2">
                      {c.flags!.map((f, i) => (
                        <Badge key={i} variant={f.level === "red" ? "negative" : "attention"}>{f.label}</Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageBody>
  );
}

function CompliancePip({ ok, label }: { ok: boolean; label: string }) {
  return <StatusDot tone={ok ? "positive" : "negative"} label={label} />;
}
