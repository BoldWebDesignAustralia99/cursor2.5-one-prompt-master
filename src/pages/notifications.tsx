import { useNotifications } from "@/services/queries";
import { PageBody, PageHeader, EmptyState } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { Bell } from "lucide-react";

export function NotificationsPage() {
  const { data } = useNotifications();
  return (
    <PageBody>
      <PageHeader title="Notifications" description="Your feed — grouped by day, deep-linked to the record, realtime." />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" />
      ) : (
        <div className="space-y-2">
          {(data ?? []).map((n) => (
            <Card key={n.id}>
              <CardContent className="flex items-start justify-between gap-3 p-4">
                <div className="flex items-start gap-3">
                  <StatusDot tone={n.is_read ? "neutral" : "progress"} className="mt-1" />
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                  </div>
                </div>
                {n.event_key ? <Badge variant="outline">{n.event_key}</Badge> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageBody>
  );
}
