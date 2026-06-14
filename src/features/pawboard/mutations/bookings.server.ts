import { eq, inArray } from 'drizzle-orm'
import * as schema from '../../../db/schema'
import { calculatePriceQuote } from '../../../domain/pricing'
import type { BookingStatus } from '../../../domain/pawboard'
import { requireDb, touch, writeAudit } from '../db-helpers.server'
import type { Database } from '../db-helpers.server'
import type { BookingInput } from '../schemas'

async function priceAndSnapshot(db: Database, input: BookingInput) {
  const [service] = await db
    .select()
    .from(schema.serviceTypes)
    .where(eq(schema.serviceTypes.id, input.serviceTypeId))
  if (!service) throw new Error('Selected service no longer exists.')

  const [settings] = await db.select().from(schema.businessSettings)
  const hstRate = settings ? settings.hstRateBps / 10000 : 0.13

  const dogs = await db
    .select()
    .from(schema.dogs)
    .where(inArray(schema.dogs.id, input.dogIds))

  const quote = calculatePriceQuote({
    service,
    startAt: input.startAt,
    endAt: input.endAt,
    dogs: dogs.map((dog) => ({
      name: dog.name,
      rateCents: dog.customRateCents ?? service.defaultRateCents,
    })),
    hstRate,
    paymentMethod: input.paymentMethod,
  })

  const careNotesSnapshot = dogs.map((dog) => ({
    dogId: dog.id,
    dogName: dog.name,
    feedingInstructions: dog.feedingInstructions,
    medicationInstructions: dog.medicationInstructions,
    behaviourNotes: dog.behaviourNotes,
    careNotes: dog.careNotes,
  }))

  return { quote, careNotesSnapshot, dogNames: dogs.map((d) => d.name) }
}

export async function createBooking(input: BookingInput) {
  const db = requireDb()
  const { quote, careNotesSnapshot, dogNames } = await priceAndSnapshot(
    db,
    input,
  )

  const id = await db.transaction(async (tx) => {
    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        ownerId: input.ownerId,
        serviceTypeId: input.serviceTypeId,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        status: input.status,
        internalNotes: input.internalNotes,
        paymentMethod: input.paymentMethod,
        careNotesSnapshot,
        quotedSubtotalCents: quote.subtotalCents,
        quotedTaxCents: quote.taxCents,
        quotedTotalCents: quote.totalCents,
        checkedInAt: input.status === 'checked_in' ? new Date() : null,
        checkedOutAt: input.status === 'checked_out' ? new Date() : null,
      })
      .returning()

    await tx
      .insert(schema.bookingDogs)
      .values(input.dogIds.map((dogId) => ({ bookingId: booking.id, dogId })))

    await writeAudit(tx, {
      action: 'created',
      entityType: 'booking',
      entityId: booking.id,
      summary: `Created booking for ${dogNames.join(', ')}.`,
    })
    return booking.id
  })

  return { id }
}

export async function updateBooking(id: string, input: BookingInput) {
  const db = requireDb()
  const { quote, careNotesSnapshot, dogNames } = await priceAndSnapshot(
    db,
    input,
  )

  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({
        ownerId: input.ownerId,
        serviceTypeId: input.serviceTypeId,
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        status: input.status,
        internalNotes: input.internalNotes,
        paymentMethod: input.paymentMethod,
        careNotesSnapshot,
        quotedSubtotalCents: quote.subtotalCents,
        quotedTaxCents: quote.taxCents,
        quotedTotalCents: quote.totalCents,
        ...touch(),
      })
      .where(eq(schema.bookings.id, id))

    await tx.delete(schema.bookingDogs).where(eq(schema.bookingDogs.bookingId, id))
    await tx
      .insert(schema.bookingDogs)
      .values(input.dogIds.map((dogId) => ({ bookingId: id, dogId })))

    await writeAudit(tx, {
      action: 'updated',
      entityType: 'booking',
      entityId: id,
      summary: `Updated booking for ${dogNames.join(', ')}.`,
    })
  })

  return { id }
}

export async function setBookingStatus(id: string, status: BookingStatus) {
  const db = requireDb()
  const now = new Date()
  await db
    .update(schema.bookings)
    .set({
      status,
      checkedInAt: status === 'checked_in' ? now : undefined,
      checkedOutAt: status === 'checked_out' ? now : undefined,
      ...touch(),
    })
    .where(eq(schema.bookings.id, id))
  await writeAudit(db, {
    action: status,
    entityType: 'booking',
    entityId: id,
    summary: `Booking marked ${status.replace('_', ' ')}.`,
  })
  return { id }
}

export async function deleteBooking(id: string) {
  const db = requireDb()
  await db.transaction(async (tx) => {
    // Detach invoices so the foreign key does not block deletion.
    await tx
      .update(schema.invoices)
      .set({ bookingId: null })
      .where(eq(schema.invoices.bookingId, id))
    await tx.delete(schema.bookingDogs).where(eq(schema.bookingDogs.bookingId, id))
    await tx.delete(schema.bookings).where(eq(schema.bookings.id, id))
    await writeAudit(tx, {
      action: 'deleted',
      entityType: 'booking',
      entityId: id,
      summary: 'Deleted booking.',
    })
  })
  return { id }
}
