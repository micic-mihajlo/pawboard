import { defineConfig } from 'drizzle-kit'

// Load `.env` only when DATABASE_URL isn't already provided, so a deploy can
// run `DATABASE_URL=... npm run db:migrate` against Supabase without the local
// `.env` overriding it.
if (!process.env.DATABASE_URL) {
  try {
    ;(process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.()
  } catch {
    // No .env file present — rely on real env vars.
  }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
