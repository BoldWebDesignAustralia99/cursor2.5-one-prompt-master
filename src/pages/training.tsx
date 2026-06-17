import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, ClipboardList, Mic, PhoneCall, Headphones } from "lucide-react";

const STAGE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  course_video: BookOpen, quiz: ClipboardList, script_drill: Mic, ai_practice_call: PhoneCall, call_review: Headphones,
};

const journey = {
  name: "New rep onboarding",
  stages: [
    { kind: "course_video", name: "Product & implants 101", progress: 100 },
    { kind: "quiz", name: "Knowledge check", progress: 100 },
    { kind: "script_drill", name: "Discovery drill (AI-graded)", progress: 60 },
    { kind: "ai_practice_call", name: "Practice call — objection handling", progress: 0 },
    { kind: "call_review", name: "Review a live call", progress: 0 },
  ],
};

export function TrainingPage() {
  return (
    <PageBody>
      <PageHeader title="Training" description="Journeys with courses, quizzes, script drills, AI practice calls, and reviews — courses live inside journeys." />
      <Card>
        <CardHeader><CardTitle className="text-sm">{journey.name}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {journey.stages.map((s, i) => {
            const Icon = STAGE_ICON[s.kind];
            return (
              <div key={i} className="space-y-1.5 rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{s.name}</span>
                    <Badge variant="outline" className="capitalize">{s.kind.replace("_", " ")}</Badge>
                  </div>
                  <span className="text-xs tabular text-muted-foreground">{s.progress}%</span>
                </div>
                <Progress value={s.progress} indicatorClassName={s.progress === 100 ? "bg-[hsl(var(--positive))]" : undefined} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </PageBody>
  );
}
