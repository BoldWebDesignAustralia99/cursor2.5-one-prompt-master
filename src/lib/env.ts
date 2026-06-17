/**
 * Centralised, validated access to the (few) public env values the browser needs.
 * Privileged keys never live here — they stay in Supabase / Vercel server env
 * (Architecture 01 §4: "Secrets in Supabase/Vercel env only; never in the repo").
 */

interface AppEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
  mapboxToken: string | null;
  appEnv: "local" | "preview" | "production";
  /** True when Supabase credentials are present; lets the UI degrade gracefully. */
  configured: boolean;
  /** When unconfigured, the app runs on in-memory demo data so it stays clickable. */
  demoMode: boolean;
}

function read(key: string): string | undefined {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
  return value && value.length > 0 ? value : undefined;
}

const supabaseUrl = read("VITE_SUPABASE_URL");
const supabaseAnonKey = read("VITE_SUPABASE_ANON_KEY");

export const env: AppEnv = {
  supabaseUrl: supabaseUrl ?? "",
  supabaseAnonKey: supabaseAnonKey ?? "",
  mapboxToken: read("VITE_MAPBOX_TOKEN") ?? null,
  appEnv: (read("VITE_APP_ENV") as AppEnv["appEnv"]) ?? "local",
  configured: Boolean(supabaseUrl && supabaseAnonKey),
  demoMode: !(supabaseUrl && supabaseAnonKey),
};
