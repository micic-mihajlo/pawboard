import { eq } from 'drizzle-orm'
import { seedSnapshot } from '../../data/seed'
import type {
  AuditLogEntry,
  Booking,
  BookingStatus,
  Dog,
  Invoice,
  Owner,
  PawboardSnapshot,
  Payment,
  ServiceType,
} from '../../domain/pawboard'
import { getDb, hasDatabaseUrl } from '../../db/client.server'
import * as schema from '../../db/schema'

function iso(value: Date | string | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : value
}

function settingsFromRow(row: typeof schema.businessSettings.$inferSelect) {
  return {
    id: row.id,
    businessName: row.businessName,
    legalName: row.legalName,
    phone: row.phone,
    email: row.email,
    address: row.address,
    timezone: row.timezone,
    hstNumber: row.hstNumber,
    hstRate: row.hstRateBps / 10000,
    invoicePrefix: row.invoicePrefix,
    nextInvoiceNumber: row.nextInvoiceNumber,
    boardingCapacity: row.boardingCapacity,
    daycareCapacity: row.daycareCapacity,
    cashPaymentInstructions: row.cashPaymentInstructions,
    etransferInstructions: row.etransferInstructions,
  }
}

function ownerFromRow(row: typeof schema.owners.$inferSelect): Owner {
  return {
    ...row,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function dogFromRow(row: typeof schema.dogs.$inferSelect): Dog {
  return {
    ...row,
    id: row.id,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function serviceFromRow(
  row: typeof schema.serviceTypes.$inferSelect,
): ServiceType {
  return { ...row, id: row.id, unit: row.unit }
}

function bookingFromRow(
  row: typeof schema.bookings.$inferSelect,
  bookingDogRows: Array<typeof schema.bookingDogs.$inferSelect>,
): Booking {
  return {
    id: row.id,
    ownerId: row.ownerId,
    dogIds: bookingDogRows
      .filter((item) => item.bookingId === row.id)
      .map((item) => item.dogId),
    serviceTypeId: row.serviceTypeId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    internalNotes: row.internalNotes,
    careNotesSnapshot: row.careNotesSnapshot as Booking['careNotesSnapshot'],
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    quotedSubtotalCents: row.quotedSubtotalCents,
    quotedTaxCents: row.quotedTaxCents,
    quotedTotalCents: row.quotedTotalCents,
    checkedInAt: iso(row.checkedInAt),
    checkedOutAt: iso(row.checkedOutAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function invoiceFromRow(row: typeof schema.invoices.$inferSelect): Invoice {
  return {
    ...row,
    id: row.id,
    bookingId: row.bookingId,
    ownerId: row.ownerId,
    issuedAt: row.issuedAt.toISOString(),
    dueAt: row.dueAt.toISOString(),
    snapshot: row.snapshot as Invoice['snapshot'],
    lineItems: row.lineItems as Invoice['lineItems'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function paymentFromRow(row: typeof schema.payments.$inferSelect): Payment {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    amountCents: row.amountCents,
    method: row.method,
    paidAt: row.paidAt.toISOString(),
    reference: row.reference,
    notes: row.notes,
  }
}

function auditFromRow(
  row: typeof schema.auditLogs.$inferSelect,
): AuditLogEntry {
  return { ...row, id: row.id, createdAt: row.createdAt.toISOString() }
}

function metrics(snapshot: Omit<PawboardSnapshot, 'metrics'>) {
  const today = new Date()
  const monthPrefix = today.toISOString().slice(0, 7)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)
  return {
    monthlyRevenueCents: snapshot.payments
      .filter((payment) => payment.paidAt.startsWith(monthPrefix))
      .reduce((sum, payment) => sum + payment.amountCents, 0),
    unpaidInvoiceTotalCents: snapshot.invoices.reduce(
      (sum, invoice) => sum + invoice.balanceCents,
      0,
    ),
    bookingsThisMonth: snapshot.bookings.filter((booking) =>
      booking.startAt.startsWith(monthPrefix),
    ).length,
    dogsCurrentlyBoarding: snapshot.bookings
      .filter((booking) => booking.status === 'checked_in')
      .reduce((sum, booking) => sum + booking.dogIds.length, 0),
    upcomingBookingsThisWeek: snapshot.bookings.filter((booking) => {
      const start = new Date(booking.startAt)
      return (
        start >= today && start <= weekEnd && booking.status !== 'cancelled'
      )
    }).length,
  }
}

export async function getPawboardSnapshot(): Promise<PawboardSnapshot> {
  if (!hasDatabaseUrl()) return seedSnapshot
  const db = getDb()
  if (!db) return seedSnapshot

  const [
    settingsRows,
    ownerRows,
    dogRows,
    serviceRows,
    bookingRows,
    bookingDogRows,
    invoiceRows,
    paymentRows,
    auditRows,
  ] = await Promise.all([
    db.select().from(schema.businessSettings),
    db.select().from(schema.owners),
    db.select().from(schema.dogs),
    db.select().from(schema.serviceTypes),
    db.select().from(schema.bookings),
    db.select().from(schema.bookingDogs),
    db.select().from(schema.invoices),
    db.select().from(schema.payments),
    db.select().from(schema.auditLogs),
  ])

  if (!settingsRows.length) return seedSnapshot

  const snapshot = {
    settings: settingsFromRow(settingsRows[0]),
    owners: ownerRows.map(ownerFromRow),
    dogs: dogRows.map(dogFromRow),
    serviceTypes: serviceRows.map(serviceFromRow),
    bookings: bookingRows.map((row) => bookingFromRow(row, bookingDogRows)),
    invoices: invoiceRows.map(invoiceFromRow),
    payments: paymentRows.map(paymentFromRow),
    auditLogs: auditRows.map(auditFromRow),
  }

  return { ...snapshot, metrics: metrics(snapshot) }
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  if (!hasDatabaseUrl()) return getPawboardSnapshot()
  const db = getDb()
  if (!db) return getPawboardSnapshot()
  const now = new Date()
  await db
    .update(schema.bookings)
    .set({
      status,
      checkedInAt: status === 'checked_in' ? now : undefined,
      checkedOutAt: status === 'checked_out' ? now : undefined,
      updatedAt: now,
    })
    .where(eq(schema.bookings.id, id))
  await db.insert(schema.auditLogs).values({
    action: status,
    entityType: 'booking',
    entityId: id,
    summary: `Booking marked ${status.replace('_', ' ')}.`,
  })
  return getPawboardSnapshot()
}
