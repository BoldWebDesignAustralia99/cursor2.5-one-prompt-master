import { useAnalysisReports } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/sonner";

const CATEGORIES = ["opening", "discovery", "urgency", "objection", "close"];

export function GradingPage() {
  const { data: reports } = useAnalysisReports();
  return (
    <PageBody>
      <PageHeader title="Grading review queue" description="Per-call scores against the weighted rubric. Approve, dispute, or coach." />
      <div className="space-y-3">
        {(reports ?? []).map((r) => {
          const scores = r.category_scores as Record<string, { score: number; band: string; rationale?: string }>;
          return (
            <Card key={r.id}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">Call · {r.booking_id}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={(r.overall_score ?? 0) >= 80 ? "positive" : (r.overall_score ?? 0) >= 60 ? "attention" : "negative"}>
                    {r.overall_score ?? "—"} overall
                  </Badge>
                  <Badge variant={r.status === "reviewed" ? "positive" : "outline"}>{r.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  {CATEGORIES.map((c) => {
                    const s = scores[c];
                    return (
                      <div key={c} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{c}</span>
                          <span className="tabular">{s?.score ?? "—"}</span>
                        </div>
                        <Progress value={s?.score ?? 0} />
                      </div>
                    );
                  })}
                </div>
                {r.rationale ? <p className="text-sm text-muted-foreground">{r.rationale}</p> : null}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast.success("Approved grade")}>Approve</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.info("Dispute opened")}>Dispute</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success("Coaching note sent to rep")}>Coach</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageBody>
  );
}
