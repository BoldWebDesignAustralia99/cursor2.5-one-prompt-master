import { useFollowUpBoard, useFollowupOverview } from "@/services/queries";
import { PageBody, PageHeader, Stat, StatGrid, pct } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot, type StatusTone } from "@/components/status-dot";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatMoney } from "@/lib/utils";
import { Clock } from "lucide-react";

export function FollowUpPage() {
  const { data } = useFollowUpBoard();
  const { data: o } = useFollowupOverview();
  const stages = data?.stages ?? [];
  const items = data?.items ?? [];

  return (
    <PageBody>
      <PageHeader
        title="Follow-up pipeline"
        description="Attended patients, worked to a treatment sale. Auto-intake when a booking outcome is showed."
      />

      <StatGrid>
        <Stat label="Won" value={o?.won ?? 0} tone="positive" />
        <Stat label="Conversion" value={pct(o?.conversion)} tone="progress" />
        <Stat label="Revenue closed" value={formatMoney(o?.revenue_closed_cents)} />
        <Stat label="Fees" value={formatMoney(o?.fees_cents)} />
      </StatGrid>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {stages.map((stage) => {
            const cards = items.filter((i) => i.stage_id === stage.id);
            const total = cards.reduce((sum, c) => sum + c.value_cents, 0);
            return (
              <div key={stage.id} className="w-72 shrink-0">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusDot tone={stage.tone as StatusTone} />
                    <span className="text-sm font-medium">{stage.name}</span>
                    <Badge variant="outline">{cards.length}</Badge>
                  </div>
                  <span className="text-xs tabular text-muted-foreground">{formatMoney(total)}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((c) => (
                    <Card key={c.id} className="cursor-pointer transition-colors hover:bg-accent/40">
                      <CardContent className="space-y-2 p-3">
                        <p className="whitespace-normal text-sm font-medium">{c.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="tabular text-sm">{formatMoney(c.value_cents)}</span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {(c.metadata as { days_since?: number })?.days_since ?? 0}d
                          </span>
                        </div>
                        {c.next_action_at ? <Badge variant="attention">Callback due</Badge> : null}
                      </CardContent>
                    </Card>
                  ))}
                  {cards.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Card>
        <CardHeader><CardTitle className="text-sm">How patients enter</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          A workflow listens for <span className="font-medium text-foreground">booking outcome = showed</span> and creates the
          card at <span className="font-medium text-foreground">Attended</span>. Won outcomes record the treatment value and
          attribute it to the clinic (and an optional commission to Dental Group).
        </CardContent>
      </Card>
    </PageBody>
  );
}
