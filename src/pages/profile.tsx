import * as React from "react";
import { useAuth } from "@/auth/auth-context";
import { useTheme } from "@/components/theme-provider";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/sonner";
import { initials } from "@/lib/utils";

export function ProfilePage() {
  const { ctx } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [name, setName] = React.useState(ctx?.profile?.full_name ?? "");

  return (
    <PageBody>
      <PageHeader title="Profile" description="Your details, roles, and notification preferences." />

      <Card>
        <CardHeader><CardTitle className="text-sm">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14"><AvatarFallback className="text-lg">{initials(name)}</AvatarFallback></Avatar>
            <div className="flex flex-wrap gap-1.5">
              {(ctx?.roles ?? []).map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={ctx?.profile?.email ?? ""} disabled /></div>
            <div className="space-y-1.5"><Label>Region</Label><Input value={ctx?.profile?.region ?? ""} disabled /></div>
            <div className="space-y-1.5"><Label>Timezone</Label><Input value={ctx?.profile?.timezone ?? ""} disabled /></div>
          </div>
          <Button onClick={() => toast.success("Profile saved")}>Save</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div><p className="text-sm">Dark mode</p><p className="text-xs text-muted-foreground">Dark-first, light supported.</p></div>
            <Switch checked={resolvedTheme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
          </div>
          <Separator />
          <PrefRow label="Email me when a callback is due" />
          <PrefRow label="Email me coaching feedback" />
          <PrefRow label="Daily digest" defaultOn={false} />
        </CardContent>
      </Card>
    </PageBody>
  );
}

function PrefRow({ label, defaultOn = true }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = React.useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm">{label}</p>
      <Switch checked={on} onCheckedChange={(v) => { setOn(v); toast.success("Preference updated"); }} />
    </div>
  );
}
