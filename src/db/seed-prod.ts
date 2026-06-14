/**
 * Minimal production seed: inserts only business settings and service/rate
 * types so the app is usable on first load. No sample owners, dogs, bookings,
 * or invoices. Idempotent — safe to run more than once.
 *
 * Run with: `DATABASE_URL=<supabase> npm run db:seed:prod`
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { seedSnapshot } from '../data/seed'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  try {
    ;(process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.()
  } catch {
    // rely on real env vars
  }
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

async function main() {
  const client = postgres(databaseUrl as string, { prepare: false })
  const db = drizzle(client, { schema })

  try {
    const { settings, serviceTypes } = seedSnapshot

    await db
      .insert(schema.businessSettings)
      .values({
        id: settings.id,
        businessName: settings.businessName,
        legalName: settings.legalName,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
        timezone: settings.timezone,
        hstNumber: settings.hstNumber,
        hstRateBps: Math.round(settings.hstRate * 10000),
        invoicePrefix: settings.invoicePrefix,
        nextInvoiceNumber: 1,
        boardingCapacity: settings.boardingCapacity,
        daycareCapacity: settings.daycareCapacity,
        cashPaymentInstructions: settings.cashPaymentInstructions,
        etransferInstructions: settings.etransferInstructions,
      })
      .onConflictDoNothing({ target: schema.businessSettings.id })

    const existing = await db
      .select({ id: schema.serviceTypes.id })
      .from(schema.serviceTypes)
    if (!existing.length) {
      await db.insert(schema.serviceTypes).values(
        serviceTypes.map((service) => ({
          name: service.name,
          description: service.description,
          unit: service.unit,
          defaultRateCents: service.defaultRateCents,
          taxable: service.taxable,
          active: service.active,
          sortOrder: service.sortOrder,
        })),
      )
    }

    console.log('Production seed complete:', {
      settings: 'ensured',
      services: existing.length ? 'kept existing' : serviceTypes.length,
    })
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Prod seed failed:', error)
  process.exit(1)
})
