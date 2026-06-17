import { useCallQueue } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export function LeadsPage() {
  const { data } = useCallQueue();
  return (
    <PageBody>
      <PageHeader title="Leads" description="Every lead/patient — one lifecycle-driven record with a unified timeline." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Suburb</TableHead><TableHead>Enquiry</TableHead>
                <TableHead>Status</TableHead><TableHead>Pricing</TableHead><TableHead>Finance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">{l.suburb}</TableCell>
                  <TableCell className="text-muted-foreground">{(l.metadata as { wants?: string })?.wants ?? l.enquiry_type}</TableCell>
                  <TableCell><Badge variant="outline">{l.status.replace("_", " ")}</Badge></TableCell>
                  <TableCell>{l.pricing_provided ? <Badge variant="positive">Provided</Badge> : <Badge variant="outline">—</Badge>}</TableCell>
                  <TableCell>
                    {l.finance_eligible === true ? <Badge variant="positive">Eligible</Badge>
                      : l.finance_eligible === false ? <Badge variant="negative">Not eligible</Badge>
                      : <Badge variant="outline">—</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageBody>
  );
}
