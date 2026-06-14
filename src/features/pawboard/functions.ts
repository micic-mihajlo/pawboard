import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getPawboardSnapshot } from './repository.server'
import {
  createOwner,
  deleteOwner,
  setOwnerActive,
  updateOwner,
} from './mutations/owners.server'
import {
  createDog,
  deleteDog,
  setDogActive,
  updateDog,
} from './mutations/dogs.server'
import {
  createBooking,
  deleteBooking,
  setBookingStatus as setBookingStatusMutation,
  updateBooking,
} from './mutations/bookings.server'
import {
  createInvoiceFromBooking,
  recordPayment,
  voidInvoice,
} from './mutations/invoices.server'
import {
  setServiceTypeActive,
  updateSettings,
  upsertServiceType,
} from './mutations/settings.server'
import {
  bookingInputSchema,
  bookingStatusUpdateSchema,
  createInvoiceSchema,
  dogInputSchema,
  idSchema,
  ownerInputSchema,
  recordPaymentSchema,
  serviceTypeInputSchema,
  settingsInputSchema,
} from './schemas'

const id = z.string().uuid()
const setActiveSchema = z.object({ id, active: z.boolean() })

export const getSnapshot = createServerFn({ method: 'GET' }).handler(() =>
  getPawboardSnapshot(),
)

// Owners
export const createOwnerFn = createServerFn({ method: 'POST' })
  .validator(ownerInputSchema)
  .handler(({ data }) => createOwner(data))

export const updateOwnerFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id, data: ownerInputSchema }))
  .handler(({ data }) => updateOwner(data.id, data.data))

export const setOwnerActiveFn = createServerFn({ method: 'POST' })
  .validator(setActiveSchema)
  .handler(({ data }) => setOwnerActive(data.id, data.active))

export const deleteOwnerFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => deleteOwner(data.id))

// Dogs
export const createDogFn = createServerFn({ method: 'POST' })
  .validator(dogInputSchema)
  .handler(({ data }) => createDog(data))

export const updateDogFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id, data: dogInputSchema }))
  .handler(({ data }) => updateDog(data.id, data.data))

export const setDogActiveFn = createServerFn({ method: 'POST' })
  .validator(setActiveSchema)
  .handler(({ data }) => setDogActive(data.id, data.active))

export const deleteDogFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => deleteDog(data.id))

// Bookings
export const createBookingFn = createServerFn({ method: 'POST' })
  .validator(bookingInputSchema)
  .handler(({ data }) => createBooking(data))

export const updateBookingFn = createServerFn({ method: 'POST' })
  .validator(z.object({ id, data: bookingInputSchema }))
  .handler(({ data }) => updateBooking(data.id, data.data))

export const setBookingStatusFn = createServerFn({ method: 'POST' })
  .validator(bookingStatusUpdateSchema)
  .handler(({ data }) => setBookingStatusMutation(data.id, data.status))

export const deleteBookingFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => deleteBooking(data.id))

// Invoices
export const createInvoiceFn = createServerFn({ method: 'POST' })
  .validator(createInvoiceSchema)
  .handler(({ data }) => createInvoiceFromBooking(data))

export const recordPaymentFn = createServerFn({ method: 'POST' })
  .validator(recordPaymentSchema)
  .handler(({ data }) => recordPayment(data))

export const voidInvoiceFn = createServerFn({ method: 'POST' })
  .validator(idSchema)
  .handler(({ data }) => voidInvoice(data.id))

// Settings + services
export const updateSettingsFn = createServerFn({ method: 'POST' })
  .validator(settingsInputSchema)
  .handler(({ data }) => updateSettings(data))

export const upsertServiceTypeFn = createServerFn({ method: 'POST' })
  .validator(serviceTypeInputSchema)
  .handler(({ data }) => upsertServiceType(data))

export const setServiceTypeActiveFn = createServerFn({ method: 'POST' })
  .validator(setActiveSchema)
  .handler(({ data }) => setServiceTypeActive(data.id, data.active))
