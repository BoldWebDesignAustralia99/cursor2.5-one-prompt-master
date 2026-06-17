import * as React from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { env } from "@/lib/env";
import type { MeContext, RoleKey } from "@/lib/types";
import { DEMO_PERSONAS, DEFAULT_PERSONA_ID } from "@/demo/personas";

interface AuthValue {
  ctx: MeContext | null;
  loading: boolean;
  isDemo: boolean;
  personaId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setPersona: (id: string) => void;
  can: (perm: string) => boolean;
  hasRole: (role: RoleKey) => boolean;
  primaryRole: RoleKey | null;
}

const AuthContext = React.createContext<AuthValue | null>(null);

const PERSONA_KEY = "gumbo-demo-persona";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ctx, setCtx] = React.useState<MeContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [personaId, setPersonaId] = React.useState<string | null>(null);

  // --- Demo mode -----------------------------------------------------------
  const applyPersona = React.useCallback((id: string) => {
    const persona = DEMO_PERSONAS.find((p) => p.id === id) ?? DEMO_PERSONAS[0];
    localStorage.setItem(PERSONA_KEY, persona.id);
    setPersonaId(persona.id);
    setCtx({
      profile: persona.profile,
      roles: persona.roles,
      permissions: persona.permissions,
      clinic_ids: persona.clinic_ids,
      is_super_admin: persona.is_super_admin,
    });
  }, []);

  // --- Real mode -----------------------------------------------------------
  const loadMe = React.useCallback(async (session: Session | null) => {
    if (!session) {
      setCtx(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("me");
    if (error || !data) {
      setCtx(null);
    } else {
      const m = data as unknown as MeContext;
      setCtx(m);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    if (env.demoMode) {
      applyPersona(localStorage.getItem(PERSONA_KEY) ?? DEFAULT_PERSONA_ID);
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => loadMe(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoading(true);
      loadMe(session);
    });
    return () => sub.subscription.unsubscribe();
  }, [applyPersona, loadMe]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    if (env.demoMode) {
      applyPersona(DEFAULT_PERSONA_ID);
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, [applyPersona]);

  const signOut = React.useCallback(async () => {
    if (env.demoMode) {
      setCtx(null);
      return;
    }
    await supabase.auth.signOut();
  }, []);

  const can = React.useCallback(
    (perm: string) => (ctx?.is_super_admin ? true : !!ctx?.permissions.includes(perm)),
    [ctx],
  );
  const hasRole = React.useCallback((role: RoleKey) => !!ctx?.roles.includes(role), [ctx]);

  const primaryRole = (ctx?.profile?.primary_role as RoleKey | undefined) ?? ctx?.roles?.[0] ?? null;

  const value: AuthValue = {
    ctx, loading, isDemo: env.demoMode, personaId,
    signIn, signOut, setPersona: applyPersona, can, hasRole, primaryRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
