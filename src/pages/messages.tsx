import * as React from "react";
import { useLeadTimeline } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Send, Phone, Mail, MessageSquare, StickyNote } from "lucide-react";

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone, email: Mail, sms: MessageSquare, internal_note: StickyNote, portal_message: MessageSquare,
};

export function MessagesPage() {
  const { data: timeline } = useLeadTimeline("lead-1");
  const [text, setText] = React.useState("");
  return (
    <PageBody>
      <PageHeader title="Messages" description="Unified SMS, internal chat, and relevant email — one timeline from the communications table." />
      <Card>
        <CardHeader><CardTitle className="text-sm">Maria Gonzalez</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(timeline ?? []).map((c) => {
            const Icon = ICON[c.channel] ?? MessageSquare;
            const inbound = c.direction === "inbound";
            return (
              <div key={c.id} className={`flex ${inbound ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-md rounded-lg border border-border p-3 ${inbound ? "bg-card" : "bg-accent"}`}>
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    <span className="capitalize">{c.channel.replace("_", " ")}</span>
                    {c.channel === "internal_note" ? <Badge variant="progress" className="ml-1">note</Badge> : null}
                  </div>
                  <p className="text-sm">{c.body}</p>
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pt-2">
            <Input placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
            <Button onClick={() => { setText(""); toast.success("Sent + logged to timeline"); }} className="gap-1.5">
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageBody>
  );
}
