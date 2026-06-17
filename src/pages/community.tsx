import * as React from "react";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { initials } from "@/lib/utils";
import { Send } from "lucide-react";

const posts = [
  { id: "1", who: "Jordan Manager", body: "Great week team — booked→shown is up 6%. Keep quoting price early! 🎯", tag: "Announcement", at: "2h" },
  { id: "2", who: "Dana Cole", body: "Closed an All-on-X today using the bone-loss explainer SMS. It works.", tag: "Win", at: "5h" },
  { id: "3", who: "Sam Rep", body: "Anyone have a good line for the 'I need to talk to my partner' objection?", tag: "Question", at: "1d" },
];

export function CommunityPage() {
  const [draft, setDraft] = React.useState("");
  return (
    <PageBody>
      <PageHeader title="Community" description="Wins, questions, and announcements from the floor." />
      <Card>
        <CardContent className="flex gap-2 p-3">
          <Input placeholder="Share a win or ask a question…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button className="gap-1.5" onClick={() => { setDraft(""); toast.success("Posted to the community"); }}>
            <Send className="h-4 w-4" /> Post
          </Button>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex gap-3 p-4">
              <Avatar><AvatarFallback>{initials(p.who)}</AvatarFallback></Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.who}</span>
                  <Badge variant="outline">{p.tag}</Badge>
                  <span className="text-xs text-muted-foreground">{p.at}</span>
                </div>
                <p className="text-sm">{p.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}
