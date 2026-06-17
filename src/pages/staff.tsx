import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/status-dot";
import { toast } from "@/components/ui/sonner";
import { initials } from "@/lib/utils";
import { DEMO_PERSONAS } from "@/demo/personas";

export function StaffPage() {
  const staff = DEMO_PERSONAS.filter((p) => p.roles.some((r) => r !== "clinic_admin" && r !== "clinic_staff"));
  return (
    <PageBody>
      <PageHeader title="Staff & access" description="Who has access to what. Create/disable staff, revoke sessions; the permissions matrix edits keys." />
      <div className="space-y-2">
        {staff.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Avatar><AvatarFallback>{initials(s.profile?.full_name)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-medium">{s.profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.profile?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {s.roles.map((r) => <Badge key={r} variant="outline">{r}</Badge>)}
                <StatusDot tone="positive" label="Active" />
                <Button size="sm" variant="ghost" onClick={() => toast.info("Session revoked")}>Revoke</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageBody>
  );
}
