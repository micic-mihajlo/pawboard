# PawBoard

Private dog boarding operations app built with TanStack Start, React, TypeScript, Tailwind CSS, Drizzle ORM, and a Supabase Postgres-compatible schema.

## Quick start (local)

PawBoard runs against a **real local Postgres** — there is no demo/seed fallback at runtime, so what you see is always backed by the database.

```bash
cp .env.example .env   # already present; default points at the local DB
docker compose up -d    # start Postgres 16 (or: npm run db:up)
npm run db:migrate      # apply the Drizzle schema
npm run db:seed         # load starter data
npm run dev             # http://localhost:3000  (sign in with code: demo)
```

Or do the first three DB steps in one shot:

```bash
npm run setup           # db up + migrate + seed
```

## What is implemented

- Authenticated, multi-route operator console (Dashboard, Owners & Dogs, Bookings, Calendar, Invoices, Exports, Settings) with a minimalist shadcn-style UI, light/dark themes, and a ⌘K global search.
- **Full CRUD, all persisted to Postgres with Zod validation and an audit trail:**
  - Owners — create, edit, archive/restore, delete (when safe).
  - Dogs — create, edit, archive/restore, delete, with full care/vet profiles.
  - Bookings — create/edit with multi-dog selection, live HST-aware price preview, care-note snapshots, status transitions (confirm / check-in / check-out / cancel), and delete.
  - Invoices — generate from a booking (auto invoice numbering), record payments (updating balances + booking payment status), void.
  - Settings — edit business profile + invoice defaults, manage service types/rates.
- Dashboard metrics, capacity-aware two-week calendar, print-friendly invoices.
- CSV exports (owners, dogs, bookings, invoices) + full JSON backup, plus an audit-history surface.
- Drizzle schema + migration and a database seed script.
- Unit tests for boarding/daycare quantity, HST, rounding, invoice totals, payment balance, and invoice numbers.

Production data is expected to live in Supabase Postgres via the same Drizzle schema and migrations.

## Commands

```bash
npm run dev          # local dev server on port 3000
npm run build        # production build
npm run test         # unit tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint

npm run db:up        # start Postgres via Docker Compose
npm run db:down      # stop Postgres
npm run db:migrate   # apply migrations to DATABASE_URL
npm run db:seed      # load starter data (idempotent)
npm run db:reset     # wipe volume, recreate, migrate, and seed
npm run db:studio    # Drizzle Studio
npm run db:generate  # generate Drizzle migrations from schema changes
npm run setup        # db:up + db:migrate + db:seed
```

## Environment variables

Set these in Vercel/project environment settings before deploying against the real Supabase project:

- `DATABASE_URL` — server-only Supabase Postgres connection string.
- `OPERATOR_ACCESS_CODE` — private operator sign-in code; local/demo defaults to `demo` when unset.
- `BETTER_AUTH_SECRET` — reserved for Better Auth setup before production launch.
- `BETTER_AUTH_URL` — deployed app URL for auth callbacks.
- `SUPABASE_URL` — Supabase project URL if Supabase SDK features are added.
- `SUPABASE_ANON_KEY` — client-safe only if needed.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; never expose to browser.

## Infrastructure note

The PRD says not to create, link, or deploy infrastructure until account and target project details are confirmed in writing. This repository therefore includes app code, migrations, and deployment-ready commands, but does not provision Vercel, Cloudflare, or Supabase resources.
