import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function LoginPage() {
  const { signIn, isDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
    else navigate("/");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Gumbo Connect</h1>
          <p className="text-sm text-muted-foreground">Enterprise dental sales platform</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              {isDemo
                ? "No Supabase connected — explore the app on demo data."
                : "Use your Gumbo Connect credentials."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {!isDemo && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                </>
              )}
              {error ? <p className="text-sm text-[hsl(var(--negative))]">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={busy}>
                {isDemo ? "Enter demo" : busy ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isDemo ? (
          <p className="text-center text-xs text-muted-foreground">
            <Badge variant="attention" className="mr-1">Demo</Badge>
            Switch personas from the top bar once inside.
          </p>
        ) : null}
      </div>
    </div>
  );
}
