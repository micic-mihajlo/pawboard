export type BookingStatus =
  | 'inquiry'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded'
export type PaymentMethod = 'cash' | 'etransfer' | 'card' | 'other'
export type ServiceUnit = 'night' | 'day' | 'flat'
export type DogSize = 'small' | 'medium' | 'large' | 'giant'
export type DogSex = 'female' | 'male' | 'unknown'
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export interface BusinessSettings {
  id: string
  businessName: string
  legalName: string
  phone: string
  email: string
  address: string
  timezone: string
  hstNumber: string
  hstRate: number
  invoicePrefix: string
  nextInvoiceNumber: number
  boardingCapacity: number
  daycareCapacity: number
  cashPaymentInstructions: string
  etransferInstructions: string
}

export interface Owner {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  address: string
  emergencyContactName: string
  emergencyContactPhone: string
  notes: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface Dog {
  id: string
  ownerId: string
  name: string
  breed: string
  birthday: string
  approximateAge: string
  size: DogSize
  sex: DogSex
  spayedNeutered: boolean
  vetName: string
  vetPhone: string
  vaccinationNotes: string
  feedingInstructions: string
  medicationInstructions: string
  behaviourNotes: string
  compatibilityNotes: string
  careNotes: string
  /** Optional per-unit rate override in cents. Null = use the service base rate. */
  customRateCents: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ServiceType {
  id: string
  name: string
  description: string
  unit: ServiceUnit
  defaultRateCents: number
  taxable: boolean
  active: boolean
  sortOrder: number
}

export interface BookingDogSnapshot {
  dogId: string
  dogName: string
  feedingInstructions: string
  medicationInstructions: string
  behaviourNotes: string
  careNotes: string
}

export interface Booking {
  id: string
  ownerId: string
  dogIds: string[]
  serviceTypeId: string
  startAt: string
  endAt: string
  status: BookingStatus
  internalNotes: string
  careNotesSnapshot: BookingDogSnapshot[]
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  quotedSubtotalCents: number
  quotedTaxCents: number
  quotedTotalCents: number
  checkedInAt: string | null
  checkedOutAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InvoiceLineItem {
  description: string
  quantity: number
  unitLabel: string
  unitPriceCents: number
  taxable: boolean
  totalCents: number
}

export interface InvoiceSnapshot {
  businessName: string
  businessAddress: string
  businessPhone: string
  businessEmail: string
  hstNumber: string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  dogNames: string[]
  bookingStartAt: string | null
  bookingEndAt: string | null
}

export interface Invoice {
  id: string
  bookingId: string | null
  ownerId: string
  invoiceNumber: string
  status: InvoiceStatus
  issuedAt: string
  dueAt: string
  snapshot: InvoiceSnapshot
  lineItems: InvoiceLineItem[]
  subtotalCents: number
  taxCents: number
  totalCents: number
  paidCents: number
  balanceCents: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  amountCents: number
  method: PaymentMethod
  paidAt: string
  reference: string
  notes: string
}

export interface AuditLogEntry {
  id: string
  actor: string
  action: string
  entityType: string
  entityId: string
  summary: string
  createdAt: string
}

export interface DashboardMetrics {
  monthlyRevenueCents: number
  unpaidInvoiceTotalCents: number
  bookingsThisMonth: number
  dogsCurrentlyBoarding: number
  upcomingBookingsThisWeek: number
}

export interface PawboardSnapshot {
  settings: BusinessSettings
  owners: Owner[]
  dogs: Dog[]
  serviceTypes: ServiceType[]
  bookings: Booking[]
  invoices: Invoice[]
  payments: Payment[]
  auditLogs: AuditLogEntry[]
  metrics: DashboardMetrics
}
