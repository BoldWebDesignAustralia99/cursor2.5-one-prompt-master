import { useLeaderboard } from "@/services/queries";
import { useAuth } from "@/auth/auth-context";
import { PageBody, PageHeader, Stat, StatGrid, pct } from "@/components/layout/page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatMoney, initials } from "@/lib/utils";
import { Flame, Trophy } from "lucide-react";

const STREAKS: Record<string, number> = { "Sam Rep": 6, "Dana Cole": 3, "Kit Rowe": 1 };

export function LeaderboardPage() {
  const { data } = useLeaderboard();
  const { ctx } = useAuth();
  const me = ctx?.profile?.full_name;
  const board = data ?? [];
  const myRow = board.find((r) => r.rep_name === me) ?? board[0];

  return (
    <PageBody>
      <PageHeader title="Leaderboard" description="Friendly competition — bookings, shows, and streaks across the floor." />

      <StatGrid>
        <Stat label="Your bookings (wk)" value={myRow?.bookings ?? 0} />
        <Stat label="Your shows" value={myRow?.shows ?? 0} tone="positive" />
        <Stat label="Your streak" value={`${STREAKS[myRow?.rep_name ?? ""] ?? 0} 🔥`} tone="attention" />
        <Stat label="Compliance" value={pct(myRow?.compliance_pass_rate)} tone="progress" />
      </StatGrid>

      <Card>
        <CardHeader><CardTitle className="text-sm">This week</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {board.map((r, i) => (
            <div
              key={r.rep_id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${r.rep_name === me ? "border-primary bg-accent/40" : "border-border"}`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center text-sm tabular text-muted-foreground">
                  {i === 0 ? <Trophy className="mx-auto h-4 w-4 text-[hsl(var(--attention))]" /> : i + 1}
                </span>
                <Avatar className="h-7 w-7"><AvatarFallback>{initials(r.rep_name)}</AvatarFallback></Avatar>
                <span className="text-sm font-medium">{r.rep_name}</span>
                {STREAKS[r.rep_name] ? (
                  <Badge variant="attention" className="gap-1"><Flame className="h-3 w-3" />{STREAKS[r.rep_name]}d</Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-4 text-sm tabular">
                <span>{r.bookings} booked</span>
                <span className="text-muted-foreground">{r.shows} shown</span>
                <span className="hidden sm:inline">{formatMoney(r.deposits_cents)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </PageBody>
  );
}
