import { PageBody, PageHeader, Stat, StatGrid } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { formatMoney } from "@/lib/utils";

const campaigns = [
  { name: "AU · Implants — Brisbane", leads: 142, cpl_cents: 2100, cpbl_cents: 14500, booked: 21, shown: 14, trend: "up" },
  { name: "AU · All-on-X — Perth", leads: 88, cpl_cents: 2600, cpbl_cents: 19800, booked: 9, shown: 6, trend: "down" },
  { name: "AU · Cosmetic — Sydney", leads: 64, cpl_cents: 1800, cpbl_cents: 11200, booked: 11, shown: 8, trend: "up" },
];

export function MarketingPage() {
  return (
    <PageBody>
      <PageHeader title="Marketing" description="Ad spend → leads → bookings → shows → revenue. No calling surfaces." />
      <StatGrid>
        <Stat label="Leads (wk)" value={campaigns.reduce((s, c) => s + c.leads, 0)} />
        <Stat label="Avg cost-per-lead" value={formatMoney(2150)} />
        <Stat label="Cost-per-booked-lead" value={formatMoney(15200)} tone="attention" />
        <Stat label="Booked → shown" value="68%" tone="progress" />
      </StatGrid>

      <Card>
        <CardHeader><CardTitle className="text-sm">Campaign efficiency</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead><TableHead>Leads</TableHead><TableHead>CPL</TableHead>
                <TableHead>Cost / booked</TableHead><TableHead>Booked</TableHead><TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="tabular">{c.leads}</TableCell>
                  <TableCell className="tabular">{formatMoney(c.cpl_cents)}</TableCell>
                  <TableCell className="tabular">{formatMoney(c.cpbl_cents)}</TableCell>
                  <TableCell className="tabular">{c.booked}</TableCell>
                  <TableCell>
                    <StatusDot tone={c.trend === "up" ? "positive" : "negative"} label={c.trend === "up" ? "Efficient" : "Climbing"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Lead source health</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="positive">Facebook webhook · healthy</Badge>
          <Badge variant="positive">Make.com · healthy</Badge>
          <Badge variant="outline">CSV import</Badge>
          <Badge variant="outline">Reactivation workflow · active</Badge>
        </CardContent>
      </Card>
    </PageBody>
  );
}
