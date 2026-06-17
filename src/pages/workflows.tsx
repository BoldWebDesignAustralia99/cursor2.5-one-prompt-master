import * as React from "react";
import { useWorkflows } from "@/services/queries";
import { useAuth } from "@/auth/auth-context";
import { PageBody, PageHeader, EmptyState } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusDot } from "@/components/status-dot";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { Workflow as WorkflowIcon, Zap, Play, GitBranch } from "lucide-react";
import type { Workflow } from "@/lib/types";

export function WorkflowsPage() {
  const { data } = useWorkflows();
  const { can } = useAuth();
  const [selected, setSelected] = React.useState<Workflow | null>(null);
  const workflows = data?.workflows ?? [];

  return (
    <PageBody>
      <PageHeader
        title="Workflow builder"
        description="Automations are data, not code. Registered triggers + actions, conditions, versioning, run logs."
        actions={can("workflows.manage") ? <Button onClick={() => toast.info("New workflow — pick a trigger to begin")}>New workflow</Button> : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-2">
          {workflows.map((w) => (
            <button key={w.id} onClick={() => setSelected(w)} className="block w-full text-left">
              <Card className={selected?.id === w.id ? "border-primary" : ""}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <StatusDot tone={w.status === "active" ? "positive" : w.status === "draft" ? "attention" : "neutral"} />
                    <div>
                      <p className="font-medium">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">v{w.version}</Badge>
                    <Badge variant={w.status === "active" ? "positive" : "outline"}>{w.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
          {workflows.length === 0 ? <EmptyState icon={WorkflowIcon} title="No workflows yet" /> : null}
        </div>

        <div className="space-y-4">
          {selected ? <WorkflowDetail workflow={selected} canManage={can("workflows.manage")} /> : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a workflow to see its canvas, simulate it, and view run logs.</CardContent></Card>
          )}
          <Registries />
        </div>
      </div>
    </PageBody>
  );
}

function WorkflowDetail({ workflow, canManage }: { workflow: Workflow; canManage: boolean }) {
  const [enabled, setEnabled] = React.useState(workflow.status === "active");
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm">{workflow.name}</CardTitle>
        {canManage ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
            <Switch checked={enabled} onCheckedChange={(v) => { setEnabled(v); toast.success(v ? "Workflow enabled" : "Workflow disabled"); }} />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* A simple node canvas representation */}
        <div className="space-y-2">
          <Node icon={Zap} kind="Trigger" label={workflow.trigger_key ?? "—"} tone="progress" />
          <Connector />
          <Node icon={GitBranch} kind="Condition" label="Rule group (AND/OR)" tone="attention" />
          <Connector />
          <Node icon={Play} kind="Action" label="Send SMS · Move pipeline stage · Notify" tone="positive" />
        </div>
        <Separator />
        <div className="flex gap-2">
          {canManage ? <Button size="sm" variant="outline" onClick={() => toast.success("Simulated against a sample entity — 3 steps OK")}>Simulate</Button> : null}
          <Button size="sm" variant="ghost" onClick={() => toast.info("Run logs: 128 runs · 2 failed · last 2m ago")}>Run logs</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Node({ icon: Icon, kind, label, tone }: { icon: React.ComponentType<{ className?: string }>; kind: string; label: string; tone: "progress" | "attention" | "positive" }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
      <StatusDot tone={tone} />
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-[10px] uppercase text-muted-foreground">{kind}</p>
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

function Connector() {
  return <div className="ml-5 h-4 w-px bg-border" />;
}

function Registries() {
  const { data } = useWorkflows();
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Library</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Triggers</p>
          <div className="flex flex-wrap gap-1.5">
            {(data?.triggers ?? []).map((t) => <Badge key={t.key} variant="outline">{t.name}</Badge>)}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Actions</p>
          <div className="flex flex-wrap gap-1.5">
            {(data?.actions ?? []).map((a) => <Badge key={a.key} variant="outline">{a.name}</Badge>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
