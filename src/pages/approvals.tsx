import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

const timesheets = [
  { id: "t1", name: "Sam Rep", hours: "8.0", date: "Today" },
  { id: "t2", name: "Dana Cole", hours: "7.5", date: "Today" },
];
const leave = [
  { id: "l1", name: "Kit Rowe", type: "Annual", dates: "12–16 Jul" },
];

export function ApprovalsPage() {
  return (
    <PageBody>
      <PageHeader title="Approvals" description="Timesheets and leave awaiting your decision." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Timesheets</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {timesheets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.date} · {t.hours}h</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Approved")}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Declined")}>Decline</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Leave requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {leave.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground"><Badge variant="outline" className="mr-1">{l.type}</Badge>{l.dates}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Approved")}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Declined")}>Decline</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageBody>
  );
}
