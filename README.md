# PawBoard

Private dog boarding operations app built from the PRD with TanStack Start, React, TypeScript, Tailwind CSS, Drizzle ORM, and Supabase Postgres-compatible schema.

## What is implemented

- Protected-app-ready TanStack Start shell for the operator dashboard.
- Dashboard for currently staying dogs, today’s check-ins/check-outs, upcoming bookings, unpaid invoices, and quick actions.
- Owner and dog contact book with care notes, emergency contacts, and active status.
- Booking list with multi-dog support, statuses, care-note snapshots, capacity-aware calendar, and pricing preview.
- Service/rate settings, HST-aware pricing, cash/e-transfer quote display, invoice snapshots, payment balances, and print-friendly invoices.
- CSV exports for owners, dogs, bookings, invoices plus full JSON backup export.
- Audit history surface.
- Drizzle schema and migration for Supabase Postgres.
- Unit tests for boarding/daycare quantity, HST, rounding, invoice totals, payment balance, and invoice numbers.

The UI uses development seed data when `DATABASE_URL` is not set. Production data is expected to live in Supabase Postgres via the checked-in Drizzle schema and migrations; do not use browser storage as the source of truth.

## Commands

```bash
npm run dev          # local dev server on port 3000
npm run build        # production build
npm run test         # unit tests
npm run typecheck    # TypeScript check
npm run lint         # ESLint
npm run db:generate  # generate Drizzle migrations
npm run db:migrate   # apply migrations to DATABASE_URL
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
