import { z } from 'zod'

export const bookingStatusEnum = z.enum([
  'inquiry',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
])
export const paymentStatusEnum = z.enum([
  'unpaid',
  'partial',
  'paid',
  'refunded',
])
export const paymentMethodEnum = z.enum(['cash', 'etransfer', 'card', 'other'])
export const serviceUnitEnum = z.enum(['night', 'day', 'flat'])
export const dogSizeEnum = z.enum(['small', 'medium', 'large', 'giant'])
export const dogSexEnum = z.enum(['female', 'male', 'unknown'])
export const invoiceStatusEnum = z.enum(['draft', 'sent', 'paid', 'void'])

const optionalEmail = z.union([z.literal(''), z.string().email()])
const id = z.string().uuid()

export const ownerInputSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  phone: z.string().trim().default(''),
  email: optionalEmail.default(''),
  address: z.string().trim().default(''),
  emergencyContactName: z.string().trim().default(''),
  emergencyContactPhone: z.string().trim().default(''),
  notes: z.string().trim().default(''),
  active: z.boolean().default(true),
})
export type OwnerInput = z.infer<typeof ownerInputSchema>

export const dogInputSchema = z.object({
  ownerId: id,
  name: z.string().trim().min(1, 'Name is required'),
  breed: z.string().trim().default(''),
  birthday: z.string().trim().default(''),
  approximateAge: z.string().trim().default(''),
  size: dogSizeEnum.default('medium'),
  sex: dogSexEnum.default('unknown'),
  spayedNeutered: z.boolean().default(false),
  vetName: z.string().trim().default(''),
  vetPhone: z.string().trim().default(''),
  vaccinationNotes: z.string().trim().default(''),
  feedingInstructions: z.string().trim().default(''),
  medicationInstructions: z.string().trim().default(''),
  behaviourNotes: z.string().trim().default(''),
  compatibilityNotes: z.string().trim().default(''),
  careNotes: z.string().trim().default(''),
  active: z.boolean().default(true),
})
export type DogInput = z.infer<typeof dogInputSchema>

export const bookingInputSchema = z
  .object({
    ownerId: id,
    serviceTypeId: id,
    dogIds: z.array(id).min(1, 'Select at least one dog'),
    startAt: z.string().min(1, 'Start date is required'),
    endAt: z.string().min(1, 'End date is required'),
    status: bookingStatusEnum.default('inquiry'),
    paymentMethod: paymentMethodEnum.default('etransfer'),
    internalNotes: z.string().trim().default(''),
  })
  .refine((value) => new Date(value.endAt) >= new Date(value.startAt), {
    message: 'End must be on or after start',
    path: ['endAt'],
  })
export type BookingInput = z.infer<typeof bookingInputSchema>

export const createInvoiceSchema = z.object({
  bookingId: id,
  dueInDays: z.number().int().min(0).max(365).default(0),
  notes: z.string().trim().default(''),
})
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

export const recordPaymentSchema = z.object({
  invoiceId: id,
  amountCents: z.number().int().positive('Amount must be positive'),
  method: paymentMethodEnum,
  paidAt: z.string().min(1),
  reference: z.string().trim().default(''),
  notes: z.string().trim().default(''),
})
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>

export const settingsInputSchema = z.object({
  businessName: z.string().trim().min(1, 'Business name is required'),
  legalName: z.string().trim().default(''),
  phone: z.string().trim().default(''),
  email: optionalEmail.default(''),
  address: z.string().trim().default(''),
  timezone: z.string().trim().min(1).default('America/Toronto'),
  hstNumber: z.string().trim().default(''),
  hstRatePercent: z.number().min(0).max(100),
  invoicePrefix: z.string().trim().min(1).default('PB'),
  boardingCapacity: z.number().int().min(0),
  daycareCapacity: z.number().int().min(0),
  cashPaymentInstructions: z.string().trim().default(''),
  etransferInstructions: z.string().trim().default(''),
})
export type SettingsInput = z.infer<typeof settingsInputSchema>

export const serviceTypeInputSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().trim().default(''),
  unit: serviceUnitEnum,
  defaultRateCents: z.number().int().min(0),
  taxable: z.boolean().default(true),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})
export type ServiceTypeInput = z.infer<typeof serviceTypeInputSchema>

export const idSchema = z.object({ id })
export const bookingStatusUpdateSchema = z.object({
  id,
  status: bookingStatusEnum,
})
