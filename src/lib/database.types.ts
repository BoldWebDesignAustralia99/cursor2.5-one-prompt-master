/**
 * Database types for the Gumbo Connect v2 Postgres schema.
 *
 * These mirror the repo migrations in `supabase/migrations/`. In a configured
 * environment they are regenerated with `npm run db:types` (Supabase CLI) so the
 * client stays in lockstep with the schema. They are hand-maintained here so the
 * typed `supabase` client and the services layer compile against a real shape
 * even before a project is connected. Excluded from lint (see eslint.config.js).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Placeholder shape — replaced with the full domain definitions below.
export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
