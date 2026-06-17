import * as React from "react";
import { PageBody, PageHeader, EmptyState } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListChecks, Plus } from "lucide-react";

interface Task { id: string; title: string; due: string; done: boolean; tone: "attention" | "progress" | "neutral" }

const initial: Task[] = [
  { id: "1", title: "Call back Maria Gonzalez", due: "Today 2:00pm", done: false, tone: "attention" },
  { id: "2", title: "Send finance options to Priya", due: "Today", done: false, tone: "progress" },
  { id: "3", title: "Review coaching note from manager", due: "Tomorrow", done: false, tone: "neutral" },
];

export function TasksPage() {
  const [tasks, setTasks] = React.useState(initial);
  const [draft, setDraft] = React.useState("");
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <PageBody>
      <PageHeader title="Tasks" description={`${remaining} open. Created by you and by workflows.`} />

      <Card>
        <CardContent className="flex gap-2 p-3">
          <Input placeholder="Add a task…" value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { setTasks((t) => [{ id: crypto.randomUUID(), title: draft, due: "Today", done: false, tone: "neutral" }, ...t]); setDraft(""); } }} />
          <Button className="gap-1.5" onClick={() => { if (draft.trim()) { setTasks((t) => [{ id: crypto.randomUUID(), title: draft, due: "Today", done: false, tone: "neutral" }, ...t]); setDraft(""); } }}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState icon={ListChecks} title="No tasks" />
      ) : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between p-3">
                <label className="flex items-center gap-3">
                  <Checkbox checked={t.done} onCheckedChange={(v) => setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, done: !!v } : x))} />
                  <span className={`text-sm ${t.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</span>
                </label>
                <Badge variant="outline">{t.due}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageBody>
  );
}
