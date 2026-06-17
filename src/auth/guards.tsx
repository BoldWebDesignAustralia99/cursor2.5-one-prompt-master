import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth-context";
import { EmptyState } from "@/components/layout/page";
import { ShieldAlert } from "lucide-react";

function FullScreenLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}

/** Gate the whole app behind a session. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { ctx, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!ctx) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/**
 * Permission gate for a route. The DB is the real lock (RLS); this is the
 * cosmetic UI layer that also keeps users out of routes they can't use
 * (Architecture 01 §4 — defence in depth, denial is enforced server-side).
 */
export function RequirePermission({
  perm,
  children,
}: {
  perm: string;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  const location = useLocation();
  if (!can(perm)) {
    return (
      <div className="p-6">
        <EmptyState
          icon={ShieldAlert}
          title="You don't have access to this"
          description={`This area requires the "${perm}" permission. Access is enforced at the database; this screen is just the friendly version. (${location.pathname})`}
        />
      </div>
    );
  }
  return <>{children}</>;
}
