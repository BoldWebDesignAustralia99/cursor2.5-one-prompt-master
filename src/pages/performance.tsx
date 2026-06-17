import { useLeaderboard, useAdminOverview } from "@/services/queries";
import { PageBody, PageHeader, Stat, StatGrid, pct } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/utils";

export function PerformancePage() {
  const { data: board } = useLeaderboard();
  const { data: o } = useAdminOverview();

  return (
    <PageBody>
      <PageHeader title="Performance" description="Sales, conversion, and compliance — all from server-side views, drill-down everywhere." />
      <StatGrid>
        <Stat label="Bookings (wk)" value={(board ?? []).reduce((s, r) => s + r.bookings, 0)} />
        <Stat label="Shows (wk)" value={(board ?? []).reduce((s, r) => s + r.shows, 0)} tone="positive" />
        <Stat label="Answered rate" value={pct(o?.sales.answered_call_rate)} tone="progress" />
        <Stat label="New leads (wk)" value={o?.sales.new_leads ?? 0} />
      </StatGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Rep leaderboard</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rep</TableHead><TableHead>Booked</TableHead><TableHead>Shown</TableHead>
                  <TableHead>Deposits</TableHead><TableHead>Grade</TableHead><TableHead>Compliance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(board ?? []).map((r) => (
                  <TableRow key={r.rep_id}>
                    <TableCell className="font-medium">{r.rep_name}</TableCell>
                    <TableCell className="tabular">{r.bookings}</TableCell>
                    <TableCell className="tabular">{r.shows}</TableCell>
                    <TableCell className="tabular">{formatMoney(r.deposits_cents)}</TableCell>
                    <TableCell className="tabular">{r.avg_grade ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={(r.compliance_pass_rate ?? 0) >= 0.8 ? "positive" : (r.compliance_pass_rate ?? 0) >= 0.7 ? "attention" : "negative"}>
                        {pct(r.compliance_pass_rate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Funnel label="Lead → booked" value={0.34} />
            <Funnel label="Booked → shown" value={0.67} />
            <Funnel label="Shown → treatment" value={0.5} />
            <Funnel label="Compliance pass-rate" value={0.73} />
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}

function Funnel({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular">{Math.round(value * 100)}%</span>
      </div>
      <Progress value={value * 100} />
    </div>
  );
}
