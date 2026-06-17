import * as React from "react";
import { PageBody, PageHeader } from "@/components/layout/page";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/sonner";
import { ALL_PERMISSION_KEYS, ROLE_PERMS } from "@/demo/personas";
import type { RoleKey } from "@/lib/types";

const ROLES: RoleKey[] = [
  "super_admin", "sales_manager", "sales_rep", "followup_rep", "marketing", "developer", "clinic_admin", "clinic_staff",
];

export function PermissionsPage() {
  const domains = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of ALL_PERMISSION_KEYS) {
      const domain = key.split(".")[0];
      map.set(domain, [...(map.get(domain) ?? []), key]);
    }
    return [...map.entries()];
  }, []);

  return (
    <PageBody>
      <PageHeader
        title="Permissions matrix"
        description="Every page, action, and sensitive field is a key. Edit role defaults live — changes are logged to activities. The database is the lock."
      />
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="sticky left-0 z-10 bg-card px-4 py-2 text-left text-xs font-medium text-muted-foreground">Permission</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {domains.map(([domain, keys]) => (
                  <React.Fragment key={domain}>
                    <tr className="bg-muted/40">
                      <td colSpan={ROLES.length + 1} className="px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {domain}
                      </td>
                    </tr>
                    {keys.map((key) => (
                      <tr key={key} className="border-b border-border/60">
                        <td className="sticky left-0 z-10 bg-card px-4 py-2 font-mono text-xs">{key}</td>
                        {ROLES.map((r) => {
                          const granted = r === "super_admin" || ROLE_PERMS[r].includes(key);
                          return (
                            <td key={r} className="px-3 py-2 text-center">
                              <Checkbox
                                checked={granted}
                                disabled={r === "super_admin"}
                                onCheckedChange={() => toast.success(`Updated ${r} · ${key}`, { description: "Change logged to activities." })}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        <Badge variant="outline" className="mr-1">Note</Badge>
        super_admin is granted everything via a resolver bypass; per-user overrides (not shown) beat these defaults.
      </p>
    </PageBody>
  );
}
