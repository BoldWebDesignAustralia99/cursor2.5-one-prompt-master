# Gumbo Connect v2

An enterprise dental-sales platform: patient booking, clinic acquisition, and
post-appointment follow-up sales running on **one shared spine**. Built to the
specification set (architecture-first, persona-driven), dark-mode-first and
mobile-first on every screen.

> **Fresh project.** This repository does **not** touch any existing/live Lovable
> Supabase database. The entire schema lives as repo migrations in
> `supabase/migrations/` and is applied to a brand-new Supabase project.

## Stack

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui (dark-first,
  light toggle), React Router, TanStack Query.
- **Backend:** Supabase — Postgres (system of record) with **RLS on every table**,
  Auth, Storage, Edge Functions (Deno), Realtime, `pg_cron`.
- **Layering (strict):** UI components → typed React Query service hooks →
  Supabase RPCs/views + Edge Functions → Postgres with RLS. No business logic in
  components; no hardcoded business rules (settings + the workflow builder).

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase values (optional — see Demo mode)
npm run dev
```

- `npm run dev` — start the app on http://localhost:5173
- `npm run build` — type-check + production build
- `npm run lint` — ESLint
- `npm run db:types` — regenerate `src/lib/database.types.ts` from a connected DB

### Demo mode (no backend required)

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent, the app runs on
in-memory **demo data** so the whole product is clickable on the Vercel preview
before Supabase is connected. A **"View the app as…"** persona switcher in the top
bar lets you see each role's world. A "Demo data" badge is always visible so it's
never mistaken for live data.

## Connect a fresh Supabase project

1. Create a new Supabase project (Australia or USA region as appropriate).
2. Apply the migrations in order, then the config seed:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # applies everything in supabase/migrations/
   psql "$DATABASE_URL" -f supabase/seed.sql   # roles, permissions, pipelines, …
   ```
3. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel/`.env.local`.
4. Create your first user in Supabase Auth, then grant a role:
   `insert into public.user_roles (user_id, role_key) values ('<uid>', 'super_admin');`

The migrations were validated by applying the full set + seed to a clean
PostgreSQL 16 instance (see `.validate/`).

## Architecture highlights

- **The spine:** `communications` (one table for every human interaction),
  `activities` (one event stream — also the audit log), a generic `pipelines`
  engine, **custom fields** (data, not code), and a nested **AND/OR rule-group**
  engine — all reused across features.
- **Security:** RLS everywhere; a **permission registry** (page/action/field keys)
  with role defaults + per-user overrides; a `super_admin` bypass resolver; a
  polymorphic `can_access_entity` so timelines are scoped (a rep only sees their
  own leads' timelines). The DB is the lock; the UI is cosmetic.
- **Availability engine:** weekly hours + date overrides + slot sizing,
  timezone-correct, with a GiST **exclusion constraint that makes double-booking
  impossible** at insert time.
- **Money:** `credit_ledger` (atomic movement function that auto-pauses a clinic
  at zero), `credit_packages`, `invoices`, `payments` — Stripe deposits and
  GoCardless billing share the vocabulary but never mix.
- **Modularity:** the **workflow builder** stores automations as data (registered
  triggers/actions, rule-group conditions, versioning, run logs); a notifications
  engine routes typed events to roles/users/channels. No hardcoded flows.
- **Analytics:** all aggregation is server-side (`v_*` views + `admin_overview` /
  `rep_leaderboard` / `followup_overview` RPCs). The browser never downloads a
  table to summarise it.

## Personas & where they land

| Persona | Home route | World |
|---|---|---|
| Super admin | `/dashboard` | Command Center, performance, finances, clinics, staff/permissions, settings, workflows, system health |
| Sales rep | `/calls` | Call Queue + the one Focused Call/Lead View (script rail, live AI notes, clinic match, pricing gate, finance check, deposit) |
| Sales manager | `/dashboard` | Floor dashboard, bookings-feed compliance, grading queue, coaching, hiring, training, approvals |
| Clinic staff/admin | `/clinic` | Clinic portal — bookings + outcomes, calendar overrides, credits/invoices (admin) |
| Post-appointment rep | `/followup` | Follow-up pipeline board, attributed outcomes |
| Marketing | `/marketing` | Ad efficiency analytics, source health, workflows (no calling) |
| Developer | `/system` | Integration health, run logs, feature flags, workflows (no calling) |

## Repository layout

```
supabase/
  migrations/         feature-scoped SQL (the spine, every domain, RLS, views, pg_cron)
  functions/          Deno edge functions (integration webhooks + privileged actions)
  seed.sql            config seed (roles, permissions, pipelines, rubric, settings, …)
src/
  app/                navigation config (role-aware)
  auth/               auth/permission context + route guards
  components/         design system (shadcn/ui) + layout (app shell)
  demo/               in-memory fixtures + personas for demo mode
  lib/                supabase client, env, database types, utils
  pages/              one file per screen
  services/           typed React Query data hooks
```
