import { useCoaching } from "@/services/queries";
import { PageBody, PageHeader, EmptyState } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { Sparkles } from "lucide-react";

export function CoachingPage() {
  const { data } = useCoaching();
  return (
    <PageBody>
      <PageHeader title="Coaching" description="Daily AI summaries per rep, with memory and 'was previous feedback implemented?' checks." />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Sparkles} title="No coaching items" />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((c) => (
            <Card key={c.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {c.is_ai_generated ? <Badge variant="progress">AI</Badge> : <Badge variant="outline">Manager</Badge>}
                    {c.category_key ? <Badge variant="outline" className="capitalize">{c.category_key}</Badge> : null}
                  </div>
                  <StatusDot
                    tone={c.implemented ? "positive" : "attention"}
                    label={c.implemented ? "Implemented" : "Pending check"}
                  />
                </div>
                <p className="text-sm">{c.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageBody>
  );
}
