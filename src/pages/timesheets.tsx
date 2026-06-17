import * as React from "react";
import { PageBody, PageHeader, Stat, StatGrid } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/status-dot";
import { toast } from "@/components/ui/sonner";
import { Clock, Play, Square } from "lucide-react";

const history = [
  { id: "1", date: "Yesterday", hours: "8.0", status: "approved" as const },
  { id: "2", date: "Mon", hours: "7.5", status: "approved" as const },
  { id: "3", date: "Today", hours: "—", status: "pending" as const },
];

export function TimesheetsPage() {
  const [clockedIn, setClockedIn] = React.useState(false);
  const [since, setSince] = React.useState<number | null>(null);
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
    if (!clockedIn || since === null) return;
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - since) / 1000)), 1000);
    return () => clearInterval(t);
  }, [clockedIn, since]);

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <PageBody>
      <PageHeader title="Timesheets" description="One-tap clock in/out. Submitted hours go to your manager for approval." />

      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8">
          <Clock className="h-8 w-8 text-muted-foreground" />
          <p className="text-4xl font-semibold tabular">{clockedIn ? `${hh}:${mm}:${ss}` : "00:00:00"}</p>
          {clockedIn ? (
            <Button variant="destructive" size="lg" className="gap-2" onClick={() => { setClockedIn(false); toast.success("Clocked out — timesheet submitted"); }}>
              <Square className="h-4 w-4" /> Clock out
            </Button>
          ) : (
            <Button size="lg" className="gap-2" onClick={() => { setClockedIn(true); setSince(Date.now()); setElapsed(0); toast.success("Clocked in"); }}>
              <Play className="h-4 w-4" /> Clock in
            </Button>
          )}
        </CardContent>
      </Card>

      <StatGrid>
        <Stat label="This week" value="38.5h" />
        <Stat label="Approved" value="31.0h" tone="positive" />
        <Stat label="Pending" value="7.5h" tone="attention" />
        <Stat label="Leave balance" value="12d" />
      </StatGrid>

      <Card>
        <CardHeader><CardTitle className="text-sm">Recent</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">{h.date}</span>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm">{h.hours}h</span>
                <StatusDot tone={h.status === "approved" ? "positive" : "attention"} label={h.status} />
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info("Leave request form")}>Request leave</Button>
        </CardContent>
      </Card>
    </PageBody>
  );
}
