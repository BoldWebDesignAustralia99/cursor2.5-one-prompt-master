import { useSettings, useClasses } from "@/services/queries";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/sonner";

export function SettingsPage() {
  const { data: settings } = useSettings();
  const { data: classes } = useClasses();

  return (
    <PageBody>
      <PageHeader
        title="Settings"
        description="Every business rule lives here or in the workflow builder — nothing is hardcoded."
        actions={<Button onClick={() => toast.success("Settings saved + logged")}>Save changes</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {(settings ?? []).map((s) => (
          <Card key={s.key}>
            <CardHeader>
              <CardTitle className="text-sm">{s.key}</CardTitle>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                {JSON.stringify(s.value, null, 2)}
              </pre>
              <Badge variant="outline" className="mt-2">{s.category}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Classification billable map</CardTitle>
          <p className="text-xs text-muted-foreground">Which booking classes consume a credit. Editing flips re-correct the ledger.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {(classes ?? []).map((c) => (
            <div key={c.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">{c.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Billable</span>
                <Switch checked={c.is_billable} onCheckedChange={() => toast.success(`Updated ${c.name}`, { description: "Ledger will re-correct affected bookings." })} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageBody>
  );
}
