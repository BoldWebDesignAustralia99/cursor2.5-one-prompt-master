import { usePayments, useInvoices, useAdminOverview } from "@/services/queries";
import { PageBody, PageHeader, Stat, StatGrid } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export function FinancesPage() {
  const { data: payments } = usePayments();
  const { data: invoices } = useInvoices();
  const { data: o } = useAdminOverview();
  const failed = (payments ?? []).filter((p) => p.status === "failed").length;

  return (
    <PageBody>
      <PageHeader title="Finances" description="Credit revenue, deposits, GoCardless collections, invoices — all reconciled server-side." />
      <StatGrid>
        <Stat label="Credit revenue (wk)" value={formatMoney(o?.money.revenue_cents)} />
        <Stat label="Failed payments" value={failed} tone={failed > 0 ? "negative" : "positive"} />
        <Stat label="Invoices issued" value={o?.money.invoices_issued ?? 0} />
        <Stat label="Deposits today" value={formatMoney(o?.today.deposits_cents)} />
      </StatGrid>

      <Card>
        <CardHeader><CardTitle className="text-sm">Payments</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead><TableHead>Provider</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(payments ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.kind.replace("_", " ")}</TableCell>
                  <TableCell className="text-muted-foreground">{p.provider}</TableCell>
                  <TableCell className="tabular">{formatMoney(p.amount_cents, p.currency as "AUD")}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "succeeded" ? "positive" : p.status === "failed" ? "negative" : "attention"}>{p.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Invoices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Number</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(invoices ?? []).map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                  <TableCell className="tabular">{formatMoney(inv.amount_cents, inv.currency as "AUD")}</TableCell>
                  <TableCell><Badge variant={inv.status === "paid" ? "positive" : "attention"}>{inv.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageBody>
  );
}
