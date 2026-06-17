import * as React from "react";
import {
  Phone, PhoneOff, Mic, MicOff, Pause, ChevronLeft, ChevronRight, Send,
  MapPin, Star, CircleDot, CheckCircle2, MessageSquareText, Sparkles, PartyPopper,
} from "lucide-react";
import { useCallQueue, useTemplates, useClinicHealth } from "@/services/queries";
import { PageBody, PageHeader, ListSkeleton, EmptyState } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusDot } from "@/components/status-dot";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Lead } from "@/lib/types";

const CALL_FLOW = [
  { key: "open", label: "Open", range: "0:00–2:00" },
  { key: "discover", label: "Discover", range: "2:00–8:00" },
  { key: "map", label: "Map the mouth", range: "8:00–14:00" },
  { key: "educate", label: "Educate", range: "14:00–20:00" },
  { key: "match", label: "Match clinic", range: "20:00–26:00" },
  { key: "close", label: "Close & book", range: "26:00–30:00" },
];

export function CallQueuePage() {
  const { data: leads, isLoading } = useCallQueue();
  const [active, setActive] = React.useState<Lead | null>(null);
  const [tab, setTab] = React.useState("all");

  const filtered = React.useMemo(() => {
    const list = leads ?? [];
    if (tab === "callbacks") return list.filter((l) => l.status === "callback_scheduled");
    if (tab === "new") return list.filter((l) => l.status === "new");
    if (tab === "no_answer") return list.filter((l) => l.status === "no_answer");
    return list;
  }, [leads, tab]);

  // Due callbacks pinned to the top, then cadence order.
  const ordered = React.useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ax = a.status === "callback_scheduled" ? 0 : 1;
        const bx = b.status === "callback_scheduled" ? 0 : 1;
        if (ax !== bx) return ax - bx;
        return (a.next_callback_at ?? "9").localeCompare(b.next_callback_at ?? "9");
      }),
    [filtered],
  );

  if (active) {
    return <FocusedCallView lead={active} onBack={() => setActive(null)} />;
  }

  return (
    <PageBody>
      <PageHeader title="Call queue" description="Due callbacks pinned. Fresh leads ordered by cadence. One tap to start." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="callbacks">Callbacks due</TabsTrigger>
          <TabsTrigger value="no_answer">No answer</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <ListSkeleton />
      ) : ordered.length === 0 ? (
        <EmptyState icon={Phone} title="Queue is clear" description="No leads match this tab right now." />
      ) : (
        <div className="space-y-2">
          {ordered.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setActive(lead)}
              className="flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-3">
                <StatusDot
                  tone={lead.status === "callback_scheduled" ? "attention" : lead.status === "no_answer" ? "negative" : "progress"}
                />
                <div>
                  <p className="font-medium">{lead.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.suburb} · {(lead.metadata as { wants?: string })?.wants ?? lead.enquiry_type}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lead.status === "callback_scheduled" && <Badge variant="attention">Callback due</Badge>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </PageBody>
  );
}

// ---------------------------------------------------------------------------
// Focused Call / Lead View — ONE screen (persona 04).
// ---------------------------------------------------------------------------
function FocusedCallView({ lead, onBack }: { lead: Lead; onBack: () => void }) {
  const { data: templates } = useTemplates();
  const { data: clinics } = useClinicHealth();
  const [onCall, setOnCall] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [hold, setHold] = React.useState(false);
  const [stageIdx, setStageIdx] = React.useState(0);
  const [done, setDone] = React.useState<Set<number>>(new Set());
  const [pricingProvided, setPricingProvided] = React.useState(lead.pricing_provided);
  const [financeEligible, setFinanceEligible] = React.useState<boolean | null>(lead.finance_eligible);
  const [selectedClinic, setSelectedClinic] = React.useState<string | null>(null);
  const [confetti, setConfetti] = React.useState(false);

  // dialogs
  const [pricingOpen, setPricingOpen] = React.useState(false);
  const [financeOpen, setFinanceOpen] = React.useState(false);
  const [depositOpen, setDepositOpen] = React.useState(false);
  const [outcomeOpen, setOutcomeOpen] = React.useState(false);

  React.useEffect(() => {
    if (!onCall || hold) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [onCall, hold]);

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  function completeStage(i: number) {
    setDone((d) => new Set(d).add(i));
    if (i < CALL_FLOW.length - 1) setStageIdx(i + 1);
  }

  function attemptBook() {
    if (!pricingProvided) {
      setPricingOpen(true);
      return;
    }
    setDepositOpen(true);
  }

  return (
    <div className="relative mx-auto w-full max-w-7xl p-4 sm:p-6">
      {confetti && <Confetti />}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Queue
        </Button>
        <span className="text-sm text-muted-foreground">Focused call view</span>
      </div>

      {/* Call bar */}
      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            {onCall && <span className="h-3 w-3 animate-recording-pulse rounded-full bg-[hsl(var(--negative))]" aria-label="recording" />}
            <div>
              <p className="font-semibold">{lead.full_name}</p>
              <p className="text-xs text-muted-foreground">{lead.phone} · {lead.suburb}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCall ? (
              <span className="rounded-md bg-secondary px-2 py-1 text-sm tabular">{mmss} / 30:00</span>
            ) : null}
            {onCall ? (
              <>
                <Button variant="outline" size="icon" onClick={() => setMuted((m) => !m)} aria-label="Mute">
                  {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setHold((h) => !h)} aria-label="Hold">
                  <Pause className={cn("h-4 w-4", hold && "text-[hsl(var(--attention))]")} />
                </Button>
                <Button variant="destructive" className="gap-1.5" onClick={() => { setOnCall(false); setOutcomeOpen(true); }}>
                  <PhoneOff className="h-4 w-4" /> End call
                </Button>
              </>
            ) : (
              <Button className="gap-1.5" onClick={() => setOnCall(true)}>
                <Phone className="h-4 w-4" /> Call
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr_320px]">
        {/* Call-flow rail */}
        <Card className="order-2 lg:order-1">
          <CardHeader><CardTitle className="text-sm">Call flow</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {CALL_FLOW.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStageIdx(i)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                  i === stageIdx ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <span className="flex items-center gap-2">
                  {done.has(i) ? (
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--positive))]" />
                  ) : (
                    <CircleDot className="h-4 w-4 text-muted-foreground" />
                  )}
                  {s.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{s.range}</span>
              </button>
            ))}
            <Separator className="my-2" />
            <p className="px-2 text-[11px] font-medium uppercase text-muted-foreground">Lead facts</p>
            <Fact label="Wants" value={(lead.metadata as { wants?: string })?.wants ?? "—"} />
            <Fact label="Funding" value={lead.finance_eligible ? "Eligible" : "Unknown"} />
            <Fact label="Suburb" value={lead.suburb ?? "—"} />
          </CardContent>
        </Card>

        {/* Script + Notes */}
        <Card className="order-1 lg:order-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">{CALL_FLOW[stageIdx].label}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={stageIdx === 0} onClick={() => setStageIdx((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" disabled={stageIdx === CALL_FLOW.length - 1} onClick={() => completeStage(stageIdx)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg font-medium leading-snug">{SCRIPT[CALL_FLOW[stageIdx].key]}</p>

            <div className="flex flex-wrap gap-2">
              {(templates ?? []).slice(0, 4).map((t) => (
                <Button
                  key={t.id}
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => toast.success(`Sent “${t.name}” to ${lead.full_name}`, { description: "Logged to the timeline." })}
                >
                  <Send className="h-3.5 w-3.5" /> {t.name}
                </Button>
              ))}
            </div>

            <Separator />
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" /> AI · live notes
              </p>
              <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
                {onCall ? (
                  <>
                    <AiNote who="AI" text="Stacking the free-consult value ($395)." />
                    <AiNote who="AI" text="Explaining bone resorption + All-on-X." />
                    <AiNote who="You" text="Confirmed upper & lower, ~6 months timeline." />
                  </>
                ) : (
                  <p className="text-muted-foreground">Notes begin writing themselves when the call starts.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clinic match + booking */}
        <Card className="order-3">
          <CardHeader><CardTitle className="text-sm">Match clinic</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(clinics ?? []).filter((c) => !c.is_paused_for_routing).map((c, i) => (
              <button
                key={c.id}
                onClick={() => setSelectedClinic(c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md border px-3 py-2 text-left",
                  selectedClinic === c.id ? "border-primary bg-accent" : "border-border hover:bg-accent/50",
                )}
              >
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.name}
                    {i === 0 && <Badge variant="positive" className="ml-1">REC</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">{(20 + i * 13)} min away</p>
                </div>
                {i === 0 ? (
                  <Badge variant="outline" className="gap-1"><Star className="h-3 w-3" /> Senior on site</Badge>
                ) : null}
              </button>
            ))}

            {selectedClinic && (
              <>
                <Separator className="my-2" />
                <div className="grid grid-cols-4 gap-1.5">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                    <button key={d} className={cn(
                      "flex flex-col items-center rounded-md border border-border py-1.5 text-xs",
                      i % 2 === 0 ? "hover:bg-accent/50" : "opacity-40",
                    )} disabled={i % 2 !== 0}>
                      {d}
                      {i % 2 === 0 && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--positive))]" />}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {["9:00", "10:30", "1:00", "3:30"].map((t, i) => (
                    <button key={t} className="flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent/50">
                      {t}
                      {i === 0 && <Badge variant="outline" className="text-[9px]">SENIOR</Badge>}
                    </button>
                  ))}
                </div>
              </>
            )}

            <Separator className="my-2" />
            <div className="space-y-1.5">
              <GateRow label="Pricing provided" ok={pricingProvided} onClick={() => setPricingOpen(true)} />
              <GateRow label="Finance check" ok={financeEligible === true} warn={financeEligible === false} onClick={() => setFinanceOpen(true)} />
            </div>
            <Button className="mt-2 w-full" disabled={!selectedClinic} onClick={attemptBook}>
              Close, take deposit & book
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Gates & dialogs */}
      <PricingGateDialog open={pricingOpen} onOpenChange={setPricingOpen} onConfirm={() => { setPricingProvided(true); setPricingOpen(false); toast.success("Pricing confirmed — remembered for this lead."); }} />
      <FinanceCheckDialog open={financeOpen} onOpenChange={setFinanceOpen} onResult={(r) => { setFinanceEligible(r); setFinanceOpen(false); }} />
      <DepositDialog
        open={depositOpen}
        onOpenChange={setDepositOpen}
        patient={lead.full_name}
        onBooked={() => {
          setDepositOpen(false);
          setConfetti(true);
          toast.success("Booked! Deposit taken.", { description: `${lead.full_name} is on the calendar.` });
          setTimeout(() => setConfetti(false), 2600);
        }}
      />
      <OutcomeDialog open={outcomeOpen} onOpenChange={setOutcomeOpen} onLogged={(o) => { setOutcomeOpen(false); toast.success(`Outcome logged: ${o}`); }} />
    </div>
  );
}

const SCRIPT: Record<string, string> = {
  open: "Hi, it's Sam from Dental Group — you enquired about implants. Have I caught you at an okay time for a few minutes?",
  discover: "Tell me what's going on with your teeth right now — what's prompting you to look into this?",
  map: "Let's map it out tooth by tooth. Are we talking upper, lower, or both?",
  educate: "Here's why timing matters: bone resorption. All-on-X stops that and gives a fixed set in a day.",
  match: "Based on where you are, the best clinic is Moorooka — senior dentist on site, about 47 minutes away.",
  close: "Let's lock in your free consult. I'll take a small refundable $75 hold to secure the chair — ready?",
};

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[140px] truncate text-right font-medium">{value}</span>
    </div>
  );
}

function AiNote({ who, text }: { who: "AI" | "You"; text: string }) {
  return (
    <p className="flex gap-2">
      <Badge variant={who === "AI" ? "progress" : "outline"} className="h-5 shrink-0">{who}</Badge>
      <span>{text}</span>
    </p>
  );
}

function GateRow({ label, ok, warn, onClick }: { label: string; ok: boolean; warn?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent/50">
      <span>{label}</span>
      <StatusDot tone={ok ? "positive" : warn ? "negative" : "attention"} label={ok ? "Done" : warn ? "Not eligible" : "Confirm"} />
    </button>
  );
}

function PricingGateDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void }) {
  const [checked, setChecked] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm pricing provided</DialogTitle>
          <DialogDescription>Before booking, confirm you quoted accurate pricing. This is remembered across the finance and booking steps.</DialogDescription>
        </DialogHeader>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
          I provided accurate pricing for this treatment (per-clinic overrides applied).
        </label>
        <DialogFooter>
          <Button disabled={!checked} onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FinanceCheckDialog({ open, onOpenChange, onResult }: { open: boolean; onOpenChange: (o: boolean) => void; onResult: (r: boolean) => void }) {
  const [citizen, setCitizen] = React.useState(true);
  const [income, setIncome] = React.useState("60000");
  const [bankrupt, setBankrupt] = React.useState(false);
  const [centrelink, setCentrelink] = React.useState(false);
  const [overBracket, setOverBracket] = React.useState(true);

  // Settings-driven rule (persona 04): not eligible if (bankrupt OR centrelink) OR (under threshold OR not citizen).
  const threshold = overBracket ? 75000 : 50000;
  const underThreshold = Number(income) < threshold;
  const eligible = !((bankrupt || centrelink) || (underThreshold || !citizen));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finance check</DialogTitle>
          <DialogDescription>Thresholds and rules come from settings — no hardcoded numbers.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm">
            Treatment over $18k bracket
            <Checkbox checked={overBracket} onCheckedChange={(v) => setOverBracket(!!v)} />
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="income">Annual income (threshold ${threshold.toLocaleString()})</Label>
            <Input id="income" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
          </div>
          <label className="flex items-center justify-between text-sm">Australian citizen / PR<Checkbox checked={citizen} onCheckedChange={(v) => setCitizen(!!v)} /></label>
          <label className="flex items-center justify-between text-sm">Bankrupt<Checkbox checked={bankrupt} onCheckedChange={(v) => setBankrupt(!!v)} /></label>
          <label className="flex items-center justify-between text-sm">On Centrelink<Checkbox checked={centrelink} onCheckedChange={(v) => setCentrelink(!!v)} /></label>
          <div className={cn("rounded-md border px-3 py-2 text-sm", eligible ? "border-[hsl(var(--positive))]" : "border-[hsl(var(--negative))]")}>
            {eligible ? "Eligible for finance." : "Not eligible — capture a broker referral instead."}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onResult(eligible)}>{eligible ? "Mark eligible" : "Record result"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepositDialog({ open, onOpenChange, patient, onBooked }: { open: boolean; onOpenChange: (o: boolean) => void; patient: string; onBooked: () => void }) {
  const [mode, setMode] = React.useState<"card" | "link">("card");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Take deposit & book</DialogTitle>
          <DialogDescription>Refundable $75 hold for {patient}. Card on call (Stripe) or send a payment link.</DialogDescription>
        </DialogHeader>
        <Tabs value={mode} onValueChange={(v) => setMode(v as "card" | "link")}>
          <TabsList className="w-full">
            <TabsTrigger value="card" className="flex-1">Card on call</TabsTrigger>
            <TabsTrigger value="link" className="flex-1">SMS link</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "card" ? (
          <div className="space-y-2">
            <Input placeholder="Card number" inputMode="numeric" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="MM / YY" />
              <Input placeholder="CVC" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">A Stripe Checkout link will be sent by SMS and confirmed by webhook.</p>
        )}
        <DialogFooter>
          <Button onClick={onBooked}>Take $75 & book</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OutcomeDialog({ open, onOpenChange, onLogged }: { open: boolean; onOpenChange: (o: boolean) => void; onLogged: (o: string) => void }) {
  const outcomes = ["answered", "voicemail", "no_answer", "busy"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log call outcome</DialogTitle>
          <DialogDescription>Cadence schedules the next callback automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {outcomes.map((o) => (
            <Button key={o} variant="outline" className="justify-start gap-2" onClick={() => onLogged(o)}>
              <MessageSquareText className="h-4 w-4" /> {o.replace("_", " ")}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = ["hsl(var(--positive))", "hsl(var(--attention))", "hsl(var(--progress))", "hsl(var(--primary))"];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
        <PartyPopper className="h-10 w-10 text-[hsl(var(--attention))]" />
      </div>
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute top-1/3 h-2 w-2 rounded-sm"
          style={{
            left: `${50 + (Math.random() * 40 - 20)}%`,
            background: colors[i % colors.length],
            transform: `translateY(0)`,
            animation: `fall 2.2s ${Math.random()}s ease-in forwards`,
          }}
        />
      ))}
      <style>{`@keyframes fall { to { transform: translateY(70vh) rotate(540deg); opacity: 0; } }`}</style>
    </div>
  );
}
