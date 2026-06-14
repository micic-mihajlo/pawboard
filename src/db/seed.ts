/**
 * Seeds the local/development Postgres database from the canonical
 * development dataset in `src/data/seed.ts`.
 *
 * The seed dataset uses friendly string ids (e.g. `owner_sarah`) so it stays
 * readable. Those are remapped to real UUIDs here so the data satisfies the
 * Drizzle schema (uuid primary keys + foreign keys).
 *
 * Run with: `npm run db:seed` (idempotent — clears and reinserts).
 */
import { randomUUID } from 'node:crypto'
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
  console.error(
    'DATABASE_URL is not set. Start Postgres with `docker compose up -d` and ensure `.env` exists.',
  )
  process.exit(1)
}

const idMap = new Map<string, string>()
function mapId(logicalId: string) {
  const existing = idMap.get(logicalId)
  if (existing) return existing
  const uuid = randomUUID()
  idMap.set(logicalId, uuid)
  return uuid
}

function date(value: string | null | undefined) {
  return value ? new Date(value) : null
}

async function main() {
  const client = postgres(databaseUrl as string, { prepare: false })
  const db = drizzle(client, { schema })

  try {
    const { settings, serviceTypes, owners, dogs, bookings, invoices, payments, auditLogs } =
      seedSnapshot

    await db.transaction(async (tx) => {
      // Clear in FK-safe order.
      await tx.delete(schema.payments)
      await tx.delete(schema.invoices)
      await tx.delete(schema.bookingDogs)
      await tx.delete(schema.bookings)
      await tx.delete(schema.dogs)
      await tx.delete(schema.serviceTypes)
      await tx.delete(schema.owners)
      await tx.delete(schema.auditLogs)
      await tx.delete(schema.businessSettings)

      await tx.insert(schema.businessSettings).values({
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
        nextInvoiceNumber: settings.nextInvoiceNumber,
        boardingCapacity: settings.boardingCapacity,
        daycareCapacity: settings.daycareCapacity,
        cashPaymentInstructions: settings.cashPaymentInstructions,
        etransferInstructions: settings.etransferInstructions,
      })

      await tx.insert(schema.serviceTypes).values(
        serviceTypes.map((service) => ({
          id: mapId(service.id),
          name: service.name,
          description: service.description,
          unit: service.unit,
          defaultRateCents: service.defaultRateCents,
          taxable: service.taxable,
          active: service.active,
          sortOrder: service.sortOrder,
        })),
      )

      await tx.insert(schema.owners).values(
        owners.map((owner) => ({
          id: mapId(owner.id),
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
          email: owner.email,
          address: owner.address,
          emergencyContactName: owner.emergencyContactName,
          emergencyContactPhone: owner.emergencyContactPhone,
          notes: owner.notes,
          active: owner.active,
        })),
      )

      await tx.insert(schema.dogs).values(
        dogs.map((dog) => ({
          id: mapId(dog.id),
          ownerId: mapId(dog.ownerId),
          name: dog.name,
          breed: dog.breed,
          birthday: dog.birthday,
          approximateAge: dog.approximateAge,
          size: dog.size,
          sex: dog.sex,
          spayedNeutered: dog.spayedNeutered,
          vetName: dog.vetName,
          vetPhone: dog.vetPhone,
          vaccinationNotes: dog.vaccinationNotes,
          feedingInstructions: dog.feedingInstructions,
          medicationInstructions: dog.medicationInstructions,
          behaviourNotes: dog.behaviourNotes,
          compatibilityNotes: dog.compatibilityNotes,
          careNotes: dog.careNotes,
          customRateCents: dog.customRateCents,
          active: dog.active,
        })),
      )

      await tx.insert(schema.bookings).values(
        bookings.map((booking) => ({
          id: mapId(booking.id),
          ownerId: mapId(booking.ownerId),
          serviceTypeId: mapId(booking.serviceTypeId),
          startAt: new Date(booking.startAt),
          endAt: new Date(booking.endAt),
          status: booking.status,
          internalNotes: booking.internalNotes,
          careNotesSnapshot: booking.careNotesSnapshot.map((note) => ({
            ...note,
            dogId: mapId(note.dogId),
          })),
          paymentMethod: booking.paymentMethod,
          paymentStatus: booking.paymentStatus,
          quotedSubtotalCents: booking.quotedSubtotalCents,
          quotedTaxCents: booking.quotedTaxCents,
          quotedTotalCents: booking.quotedTotalCents,
          checkedInAt: date(booking.checkedInAt),
          checkedOutAt: date(booking.checkedOutAt),
        })),
      )

      const bookingDogRows = bookings.flatMap((booking) =>
        booking.dogIds.map((dogId) => ({
          bookingId: mapId(booking.id),
          dogId: mapId(dogId),
        })),
      )
      if (bookingDogRows.length) {
        await tx.insert(schema.bookingDogs).values(bookingDogRows)
      }

      await tx.insert(schema.invoices).values(
        invoices.map((invoice) => ({
          id: mapId(invoice.id),
          bookingId: invoice.bookingId ? mapId(invoice.bookingId) : null,
          ownerId: mapId(invoice.ownerId),
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issuedAt: new Date(invoice.issuedAt),
          dueAt: new Date(invoice.dueAt),
          snapshot: invoice.snapshot,
          lineItems: invoice.lineItems,
          subtotalCents: invoice.subtotalCents,
          taxCents: invoice.taxCents,
          totalCents: invoice.totalCents,
          paidCents: invoice.paidCents,
          balanceCents: invoice.balanceCents,
          notes: invoice.notes,
        })),
      )

      if (payments.length) {
        await tx.insert(schema.payments).values(
          payments.map((payment) => ({
            id: mapId(payment.id),
            invoiceId: mapId(payment.invoiceId),
            amountCents: payment.amountCents,
            method: payment.method,
            paidAt: new Date(payment.paidAt),
            reference: payment.reference,
            notes: payment.notes,
          })),
        )
      }

      if (auditLogs.length) {
        await tx.insert(schema.auditLogs).values(
          auditLogs.map((log) => ({
            id: mapId(log.id),
            actor: log.actor,
            action: log.action,
            entityType: log.entityType,
            // Remap to the real entity uuid when we know it.
            entityId: idMap.get(log.entityId) ?? log.entityId,
            summary: log.summary,
            createdAt: new Date(log.createdAt),
          })),
        )
      }
    })

    const counts = {
      owners: owners.length,
      dogs: dogs.length,
      services: serviceTypes.length,
      bookings: bookings.length,
      invoices: invoices.length,
      payments: payments.length,
    }
    console.log('Seeded PawBoard database:', counts)
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
