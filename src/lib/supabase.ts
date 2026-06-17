import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

/**
 * The single Supabase browser client. Typed against the repo's generated
 * `Database` types so every service call is column-checked at compile time.
 *
 * When credentials are absent (e.g. a fresh checkout with no `.env.local`),
 * we still construct a client against a placeholder URL so imports never throw;
 * `env.configured` lets the UI show a "connect Supabase" state instead.
 */
export const supabase = createClient<Database>(
  env.configured ? env.supabaseUrl : "https://placeholder.supabase.co",
  env.configured ? env.supabaseAnonKey : "public-anon-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
