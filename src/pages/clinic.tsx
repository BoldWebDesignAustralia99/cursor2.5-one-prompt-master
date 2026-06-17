import * as React from "react";
import { useAuth } from "@/auth/auth-context";
import { useClinicHealth, useCreditPackages, useInvoices, useBookingsFeed } from "@/services/queries";
import { PageBody, PageHeader, EmptyState } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { formatMoney, cn } from "@/lib/utils";
import { Building2, CreditCard, CalendarDays, CircleCheck } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ClinicPortalPage() {
  const { ctx } = useAuth();
  const { data: clinics } = useClinicHealth();
  const isAdmin = ctx?.roles.includes("clinic_admin") || ctx?.is_super_admin;
  const myClinics = (clinics ?? []).filter(
    (c) => ctx?.is_super_admin || ctx?.clinic_ids.includes(c.id),
  );
  const [activeId, setActiveId] = React.useState<string | null>(myClinics[0]?.id ?? null);
  const active = myClinics.find((c) => c.id === activeId) ?? myClinics[0];

  if (myClinics.length === 0) {
    return (
      <PageBody>
        <EmptyState icon={Building2} title="No clinics linked to your login" description="A platform admin can add you to a clinic." />
      </PageBody>
    );
  }

  return (
    <PageBody>
      <PageHeader
        title="Clinic portal"
        description="Keep your calendar accurate, see incoming patients, confirm outcomes."
        actions={myClinics.length > 1 ? (
          <div className="flex gap-1">
            {myClinics.map((c) => (
              <Button key={c.id} variant={c.id === active?.id ? "default" : "outline"} size="sm" onClick={() => setActiveId(c.id)}>
                {c.name}
              </Button>
            ))}
          </div>
        ) : undefined}
      />

      {active?.credit_state !== "healthy" && isAdmin ? (
        <Card className="border-[hsl(var(--attention))]">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <StatusDot tone={active?.credit_state === "zero" ? "negative" : "attention"} />
              <span className="text-sm">
                {active?.credit_state === "zero"
                  ? "Paused — top up to resume new bookings."
                  : `Low on credits (${active?.credit_balance} left).`}
              </span>
            </div>
            <BuyCreditsButton />
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="bookings">
        <TabsList>
          <TabsTrigger value="bookings"><CalendarDays className="h-4 w-4" /> Bookings</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4" /> Calendar</TabsTrigger>
          {isAdmin ? <TabsTrigger value="billing"><CreditCard className="h-4 w-4" /> Credits & billing</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="bookings"><ClinicBookings clinicId={active?.id} /></TabsContent>
        <TabsContent value="calendar"><CalendarManager /></TabsContent>
        {isAdmin ? <TabsContent value="billing"><Billing balance={active?.credit_balance ?? 0} /></TabsContent> : null}
      </Tabs>
    </PageBody>
  );
}

function ClinicBookings({ clinicId }: { clinicId?: string }) {
  const { data: bookings } = useBookingsFeed();
  const mine = (bookings ?? []).filter((b) => !clinicId || b.clinic_id === clinicId);
  if (mine.length === 0) return <EmptyState icon={CalendarDays} title="No bookings yet" />;
  return (
    <div className="space-y-2">
      {mine.map((b) => (
        <Card key={b.id}>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">{b.patient_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(b.scheduled_at).toLocaleString()} · {b.practitioner_name}
              </p>
              {b.ai_brief ? <p className="mt-1 max-w-md text-xs text-muted-foreground">AI brief: {b.ai_brief}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={b.status === "showed" ? "positive" : b.status === "no_show" ? "negative" : "progress"}>{b.status}</Badge>
              {b.status === "scheduled" || b.status === "confirmed" ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => toast.success("Marked showed")}>Showed</Button>
                  <Button size="sm" variant="ghost" onClick={() => toast.success("Marked no-show")}>No-show</Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CalendarManager() {
  const [hours, setHours] = React.useState<Record<string, boolean>>(
    Object.fromEntries(WEEKDAYS.map((d, i) => [d, i < 5])),
  );
  const [overrideOpen, setOverrideOpen] = React.useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Weekly hours — Dr. Helen Park</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setOverrideOpen(true)}>Add date override</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <Switch checked={hours[d]} onCheckedChange={(v) => setHours((h) => ({ ...h, [d]: v }))} />
                <span className="text-sm">{d}</span>
              </div>
              <span className={cn("text-sm tabular", hours[d] ? "text-foreground" : "text-muted-foreground")}>
                {hours[d] ? "9:00 – 17:00" : "Closed"}
              </span>
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            Slots are generated duration + buffer apart. Existing bookings block slots — a database constraint makes double-booking impossible.
          </p>
        </CardContent>
      </Card>
      <OverrideDialog open={overrideOpen} onOpenChange={setOverrideOpen} />
    </div>
  );
}

function OverrideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [kind, setKind] = React.useState<"closed" | "special">("closed");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Date override</DialogTitle>
          <DialogDescription>Closed date blocks the whole day; special hours replace that day's hours.</DialogDescription>
        </DialogHeader>
        <Tabs value={kind} onValueChange={(v) => setKind(v as "closed" | "special")}>
          <TabsList className="w-full">
            <TabsTrigger value="closed" className="flex-1">Closed date</TabsTrigger>
            <TabsTrigger value="special" className="flex-1">Special hours</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Date</Label><Input type="date" /></div>
          {kind === "special" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>From</Label><Input type="time" defaultValue="12:00" /></div>
              <div className="space-y-1.5"><Label>To</Label><Input type="time" defaultValue="20:00" /></div>
            </div>
          ) : (
            <div className="space-y-1.5"><Label>Reason</Label><Input placeholder="e.g. Dentist sick" /></div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => { onOpenChange(false); toast.success("Calendar updated", { description: "Bookable slots refreshed instantly." }); }}>
            Save override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Billing({ balance }: { balance: number }) {
  const { data: packages } = useCreditPackages();
  const { data: invoices } = useInvoices();
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Credit balance</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-3xl font-semibold tabular">{balance}<span className="ml-1 text-sm text-muted-foreground">credits</span></p>
          <BuyCreditsButton />
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {(packages ?? []).map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2 p-4">
              <p className="font-medium">{p.name}</p>
              <p className="text-2xl font-semibold tabular">{formatMoney(p.price_cents, p.currency as "AUD")}</p>
              <p className="text-xs text-muted-foreground">{p.credits} credits</p>
              <Button size="sm" className="w-full" onClick={() => toast.success(`Charged via GoCardless — ${p.credits} credits added`, { description: "Invoice emailed." })}>Buy</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(invoices ?? []).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-2">
                <CircleCheck className={cn("h-4 w-4", inv.status === "paid" ? "text-[hsl(var(--positive))]" : "text-muted-foreground")} />
                <span className="text-sm">{inv.number}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="tabular text-sm">{formatMoney(inv.amount_cents, inv.currency as "AUD")}</span>
                <Badge variant={inv.status === "paid" ? "positive" : "attention"}>{inv.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function BuyCreditsButton() {
  return (
    <Button size="sm" onClick={() => toast.success("Charged via your GoCardless mandate", { description: "Numbered invoice on its way." })}>
      Buy credits
    </Button>
  );
}
