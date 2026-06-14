import { relations } from 'drizzle-orm'
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const bookingStatus = pgEnum('booking_status', [
  'inquiry',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
])
export const paymentStatus = pgEnum('payment_status', [
  'unpaid',
  'partial',
  'paid',
  'refunded',
])
export const paymentMethod = pgEnum('payment_method', [
  'cash',
  'etransfer',
  'card',
  'other',
])
export const serviceUnit = pgEnum('service_unit', ['night', 'day', 'flat'])
export const dogSize = pgEnum('dog_size', ['small', 'medium', 'large', 'giant'])
export const dogSex = pgEnum('dog_sex', ['female', 'male', 'unknown'])
export const invoiceStatus = pgEnum('invoice_status', [
  'draft',
  'sent',
  'paid',
  'void',
])

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
}

export const businessSettings = pgTable('business_settings', {
  id: text('id').primaryKey().default('settings_main'),
  businessName: text('business_name').notNull(),
  legalName: text('legal_name').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  address: text('address').notNull().default(''),
  timezone: text('timezone').notNull().default('America/Toronto'),
  hstNumber: text('hst_number').notNull().default(''),
  hstRateBps: integer('hst_rate_bps').notNull().default(1300),
  invoicePrefix: text('invoice_prefix').notNull().default('PB'),
  nextInvoiceNumber: integer('next_invoice_number').notNull().default(1),
  boardingCapacity: integer('boarding_capacity').notNull().default(8),
  daycareCapacity: integer('daycare_capacity').notNull().default(12),
  cashPaymentInstructions: text('cash_payment_instructions')
    .notNull()
    .default(''),
  etransferInstructions: text('etransfer_instructions').notNull().default(''),
  ...timestamps,
})

export const owners = pgTable('owners', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  address: text('address').notNull().default(''),
  emergencyContactName: text('emergency_contact_name').notNull().default(''),
  emergencyContactPhone: text('emergency_contact_phone').notNull().default(''),
  notes: text('notes').notNull().default(''),
  active: boolean('active').notNull().default(true),
  ...timestamps,
})

export const dogs = pgTable('dogs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .references(() => owners.id)
    .notNull(),
  name: text('name').notNull(),
  breed: text('breed').notNull().default(''),
  birthday: text('birthday').notNull().default(''),
  approximateAge: text('approximate_age').notNull().default(''),
  size: dogSize('size').notNull().default('medium'),
  sex: dogSex('sex').notNull().default('unknown'),
  spayedNeutered: boolean('spayed_neutered').notNull().default(false),
  vetName: text('vet_name').notNull().default(''),
  vetPhone: text('vet_phone').notNull().default(''),
  vaccinationNotes: text('vaccination_notes').notNull().default(''),
  feedingInstructions: text('feeding_instructions').notNull().default(''),
  medicationInstructions: text('medication_instructions').notNull().default(''),
  behaviourNotes: text('behaviour_notes').notNull().default(''),
  compatibilityNotes: text('compatibility_notes').notNull().default(''),
  careNotes: text('care_notes').notNull().default(''),
  // Optional per-unit rate override (cents). Null = use the service base rate.
  customRateCents: integer('custom_rate_cents'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
})

export const serviceTypes = pgTable('service_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  unit: serviceUnit('unit').notNull(),
  defaultRateCents: integer('default_rate_cents').notNull(),
  taxable: boolean('taxable').notNull().default(true),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
})

export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id')
    .references(() => owners.id)
    .notNull(),
  serviceTypeId: uuid('service_type_id')
    .references(() => serviceTypes.id)
    .notNull(),
  startAt: timestamp('start_at', { withTimezone: true }).notNull(),
  endAt: timestamp('end_at', { withTimezone: true }).notNull(),
  status: bookingStatus('status').notNull().default('inquiry'),
  internalNotes: text('internal_notes').notNull().default(''),
  careNotesSnapshot: jsonb('care_notes_snapshot').notNull().default([]),
  paymentMethod: paymentMethod('payment_method').notNull().default('etransfer'),
  paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
  quotedSubtotalCents: integer('quoted_subtotal_cents').notNull().default(0),
  quotedTaxCents: integer('quoted_tax_cents').notNull().default(0),
  quotedTotalCents: integer('quoted_total_cents').notNull().default(0),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  checkedOutAt: timestamp('checked_out_at', { withTimezone: true }),
  ...timestamps,
})

export const bookingDogs = pgTable('booking_dogs', {
  bookingId: uuid('booking_id')
    .references(() => bookings.id)
    .notNull(),
  dogId: uuid('dog_id')
    .references(() => dogs.id)
    .notNull(),
})

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').references(() => bookings.id),
  ownerId: uuid('owner_id')
    .references(() => owners.id)
    .notNull(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  status: invoiceStatus('status').notNull().default('draft'),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
  dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
  snapshot: jsonb('snapshot').notNull(),
  lineItems: jsonb('line_items').notNull(),
  subtotalCents: integer('subtotal_cents').notNull(),
  taxCents: integer('tax_cents').notNull(),
  totalCents: integer('total_cents').notNull(),
  paidCents: integer('paid_cents').notNull().default(0),
  balanceCents: integer('balance_cents').notNull(),
  notes: text('notes').notNull().default(''),
  ...timestamps,
})

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id')
    .references(() => invoices.id)
    .notNull(),
  amountCents: integer('amount_cents').notNull(),
  method: paymentMethod('method').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
  reference: text('reference').notNull().default(''),
  notes: text('notes').notNull().default(''),
  ...timestamps,
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actor: text('actor').notNull().default('operator'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  summary: text('summary').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const ownerRelations = relations(owners, ({ many }) => ({
  dogs: many(dogs),
  bookings: many(bookings),
  invoices: many(invoices),
}))

export const dogRelations = relations(dogs, ({ one }) => ({
  owner: one(owners, { fields: [dogs.ownerId], references: [owners.id] }),
}))
