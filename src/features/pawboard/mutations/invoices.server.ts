import { eq, inArray } from 'drizzle-orm'
import * as schema from '../../../db/schema'
import {
  calculateInvoiceTotals,
  calculatePriceQuote,
  dogRateForService,
  generateInvoiceNumber,
} from '../../../domain/pricing'
import type {
  BookingDogSnapshot,
  InvoiceSnapshot,
  PaymentStatus,
} from '../../../domain/pawboard'
import { requireDb, touch, writeAudit } from '../db-helpers.server'
import type { CreateInvoiceInput, RecordPaymentInput } from '../schemas'

export async function createInvoiceFromBooking(input: CreateInvoiceInput) {
  const db = requireDb()

  return db.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, input.bookingId))
    if (!booking) throw new Error('Booking not found.')

    const [owner] = await tx
      .select()
      .from(schema.owners)
      .where(eq(schema.owners.id, booking.ownerId))
    const [service] = await tx
      .select()
      .from(schema.serviceTypes)
      .where(eq(schema.serviceTypes.id, booking.serviceTypeId))
    const [settings] = await tx.select().from(schema.businessSettings)
    if (!owner || !service || !settings) {
      throw new Error('Missing owner, service, or business settings.')
    }

    const hstRate = settings.hstRateBps / 10000
    const careNotes = booking.careNotesSnapshot as BookingDogSnapshot[]

    // Fetch the booking's current dogs to apply per-dog rate overrides.
    const dogLinks = await tx
      .select({ dogId: schema.bookingDogs.dogId })
      .from(schema.bookingDogs)
      .where(eq(schema.bookingDogs.bookingId, booking.id))
    const dogRows = dogLinks.length
      ? await tx
          .select()
          .from(schema.dogs)
          .where(
            inArray(
              schema.dogs.id,
              dogLinks.map((link) => link.dogId),
            ),
          )
      : []
    const priceDogs = dogRows.length
      ? dogRows.map((dog) => ({
          name: dog.name,
          rateCents: dogRateForService(dog, service),
        }))
      : careNotes.map((note) => ({
          name: note.dogName,
          rateCents: service.defaultRateCents,
        }))
    const dogNames = priceDogs.map((dog) => dog.name)

    const quote = calculatePriceQuote({
      service,
      startAt: booking.startAt,
      endAt: booking.endAt,
      dogs: priceDogs,
      hstRate,
      paymentMethod: booking.paymentMethod,
    })
    const totals = calculateInvoiceTotals(quote.lineItems, hstRate)

    const invoiceNumber = generateInvoiceNumber({
      invoicePrefix: settings.invoicePrefix,
      nextInvoiceNumber: settings.nextInvoiceNumber,
    })

    const issuedAt = new Date()
    const dueAt = new Date(issuedAt)
    dueAt.setDate(dueAt.getDate() + input.dueInDays)

    const snapshot: InvoiceSnapshot = {
      businessName: settings.businessName,
      businessAddress: settings.address,
      businessPhone: settings.phone,
      businessEmail: settings.email,
      hstNumber: settings.hstNumber,
      ownerName: `${owner.firstName} ${owner.lastName}`,
      ownerEmail: owner.email,
      ownerPhone: owner.phone,
      dogNames,
      bookingStartAt: booking.startAt.toISOString(),
      bookingEndAt: booking.endAt.toISOString(),
    }

    const [invoice] = await tx
      .insert(schema.invoices)
      .values({
        bookingId: booking.id,
        ownerId: owner.id,
        invoiceNumber,
        status: 'sent',
        issuedAt,
        dueAt,
        snapshot,
        lineItems: quote.lineItems,
        subtotalCents: totals.subtotalCents,
        taxCents: totals.taxCents,
        totalCents: totals.totalCents,
        paidCents: 0,
        balanceCents: totals.totalCents,
        notes: input.notes,
      })
      .returning()

    await tx
      .update(schema.businessSettings)
      .set({ nextInvoiceNumber: settings.nextInvoiceNumber + 1, ...touch() })
      .where(eq(schema.businessSettings.id, settings.id))

    await writeAudit(tx, {
      action: 'created',
      entityType: 'invoice',
      entityId: invoice.id,
      summary: `Created invoice ${invoiceNumber} for ${snapshot.ownerName}.`,
    })

    return { id: invoice.id, invoiceNumber }
  })
}

export async function recordPayment(input: RecordPaymentInput) {
  const db = requireDb()

  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(schema.invoices)
      .where(eq(schema.invoices.id, input.invoiceId))
    if (!invoice) throw new Error('Invoice not found.')

    await tx.insert(schema.payments).values({
      invoiceId: input.invoiceId,
      amountCents: input.amountCents,
      method: input.method,
      paidAt: new Date(input.paidAt),
      reference: input.reference,
      notes: input.notes,
    })

    const paidCents = invoice.paidCents + input.amountCents
    const balanceCents = Math.max(0, invoice.totalCents - paidCents)
    const status = balanceCents === 0 ? 'paid' : invoice.status

    await tx
      .update(schema.invoices)
      .set({ paidCents, balanceCents, status, ...touch() })
      .where(eq(schema.invoices.id, input.invoiceId))

    if (invoice.bookingId) {
      const paymentStatus: PaymentStatus =
        balanceCents === 0 ? 'paid' : paidCents > 0 ? 'partial' : 'unpaid'
      await tx
        .update(schema.bookings)
        .set({ paymentStatus, ...touch() })
        .where(eq(schema.bookings.id, invoice.bookingId))
    }

    await writeAudit(tx, {
      action: 'payment_recorded',
      entityType: 'invoice',
      entityId: invoice.id,
      summary: `Recorded ${input.method} payment for ${invoice.invoiceNumber}.`,
    })

    return { id: invoice.id }
  })
}

export async function voidInvoice(id: string) {
  const db = requireDb()
  await db
    .update(schema.invoices)
    .set({ status: 'void', ...touch() })
    .where(eq(schema.invoices.id, id))
  await writeAudit(db, {
    action: 'voided',
    entityType: 'invoice',
    entityId: id,
    summary: 'Voided invoice.',
  })
  return { id }
}
