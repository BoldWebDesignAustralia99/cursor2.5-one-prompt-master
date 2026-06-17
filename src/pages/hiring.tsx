import { useCandidates } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import type { Candidate } from "@/lib/types";

const STAGES: Candidate["status"][] = ["applied", "screening", "interview", "offer", "hired", "rejected"];

export function HiringPage() {
  const { data } = useCandidates();
  return (
    <PageBody>
      <PageHeader title="Hiring" description="Candidates → group interview → scorecard → offer. On acceptance, auto-create staff + enrol in onboarding." />
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {STAGES.map((stage) => {
          const cands = (data ?? []).filter((c) => c.status === stage);
          return (
            <div key={stage} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{stage}</p>
              {cands.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-2 p-3">
                    <p className="text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground">{c.source}</p>
                    {stage === "offer" ? (
                      <Button size="sm" className="w-full" onClick={() => toast.success("Offer accepted — staff created + enrolled in onboarding")}>
                        Mark accepted
                      </Button>
                    ) : stage === "interview" ? (
                      <Badge variant="progress">Group video</Badge>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
              {cands.length === 0 ? <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">—</div> : null}
            </div>
          );
        })}
      </div>
    </PageBody>
  );
}
