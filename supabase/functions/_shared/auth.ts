import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/**
 * Build a Supabase client bound to the caller's JWT so that RLS + the permission
 * registry apply inside the function too (Architecture 01 §4: "edge functions
 * check permissions next"). Returns null when there is no valid session.
 */
export function clientForRequest(req: Request): SupabaseClient | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

/** A service-role client for privileged writes after permission checks pass. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** True if the caller holds the given permission key (server-side check). */
export async function authorize(client: SupabaseClient, perm: string): Promise<boolean> {
  const { data, error } = await client.rpc("authorize", { p_perm: perm });
  return !error && data === true;
}
