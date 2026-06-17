import * as React from "react";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";

const initial = [
  { key: "live_transcription", name: "Live transcription (Deepgram)", description: "Realtime transcripts + live copilot.", enabled: true },
  { key: "followup_module", name: "Post-appointment follow-up", description: "The follow-up sales pipeline + workspace.", enabled: true },
  { key: "xero_sync", name: "Xero invoice sync", description: "Push numbered invoices to Xero.", enabled: false },
  { key: "ai_admin_chat", name: "Admin data chat", description: "Ask questions of the data in natural language.", enabled: false },
];

export function FlagsPage() {
  const [flags, setFlags] = React.useState(initial);
  return (
    <PageBody>
      <PageHeader title="Feature flags" description="Ship behind flags, roll out to a subset, then enable for everyone." />
      <div className="space-y-2">
        {flags.map((f) => (
          <Card key={f.key}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{f.name}</p>
                  <Badge variant={f.enabled ? "positive" : "outline"}>{f.enabled ? "on" : "off"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{f.description}</p>
              </div>
              <Switch
                checked={f.enabled}
                onCheckedChange={(v) => {
                  setFlags((prev) => prev.map((x) => (x.key === f.key ? { ...x, enabled: v } : x)));
                  toast.success(`${f.name} ${v ? "enabled" : "disabled"}`);
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}
