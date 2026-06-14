import { getPawboardSnapshot } from '../pawboard/repository.server'
import { createOwner } from '../pawboard/mutations/owners.server'
import { createDog } from '../pawboard/mutations/dogs.server'
import {
  createBooking,
  setBookingStatus,
} from '../pawboard/mutations/bookings.server'
import {
  createInvoiceFromBooking,
  recordPayment,
} from '../pawboard/mutations/invoices.server'
import {
  bookingInputSchema,
  bookingStatusEnum,
  createInvoiceSchema,
  dogInputSchema,
  ownerInputSchema,
  recordPaymentSchema,
} from '../pawboard/schemas'
import { calculatePriceQuote, formatMoney } from '../../domain/pricing'
import type { PawboardSnapshot } from '../../domain/pawboard'
import type { JsonValue, PendingAction } from './types'

interface ToolDef {
  name: string
  description: string
  write: boolean
  parameters: Record<string, unknown>
}

const obj = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({ type: 'object', properties, required, additionalProperties: false })
const str = (description: string) => ({ type: 'string', description })

export const toolDefs: ToolDef[] = [
  {
    name: 'get_snapshot',
    description:
      'Read the current business data: settings, services, owners, dogs, bookings, invoices, and dashboard metrics. Returns ids needed for other tools. Call this first.',
    write: false,
    parameters: obj({}),
  },
  {
    name: 'create_owner',
    description: 'Create a new owner (customer) record.',
    write: true,
    parameters: obj(
      {
        firstName: str('Owner first name'),
        lastName: str('Owner last name'),
        phone: str('Phone number'),
        email: str('Email address'),
        address: str('Mailing address'),
        notes: str('Internal notes'),
      },
      ['firstName', 'lastName'],
    ),
  },
  {
    name: 'create_dog',
    description: "Add a dog to an existing owner. Use the owner's id from get_snapshot.",
    write: true,
    parameters: obj(
      {
        ownerId: str('Owner id (uuid) from get_snapshot'),
        name: str('Dog name'),
        breed: str('Breed'),
        size: { type: 'string', enum: ['small', 'medium', 'large', 'giant'] },
        sex: { type: 'string', enum: ['female', 'male', 'unknown'] },
        feedingInstructions: str('Feeding instructions'),
        medicationInstructions: str('Medication instructions'),
        careNotes: str('Care notes'),
      },
      ['ownerId', 'name'],
    ),
  },
  {
    name: 'create_booking',
    description:
      'Create a booking for an owner and one or more of their dogs. Dates are ISO 8601 with timezone. Pricing is computed automatically.',
    write: true,
    parameters: obj(
      {
        ownerId: str('Owner id (uuid)'),
        serviceTypeId: str('Service id (uuid) from get_snapshot'),
        dogIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Dog ids (uuid) for this booking',
        },
        startAt: str('Start datetime, ISO 8601 (e.g. 2026-06-20T19:00:00.000Z)'),
        endAt: str('End datetime, ISO 8601'),
        status: {
          type: 'string',
          enum: ['inquiry', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
        },
        internalNotes: str('Internal notes'),
      },
      ['ownerId', 'serviceTypeId', 'dogIds', 'startAt', 'endAt'],
    ),
  },
  {
    name: 'set_booking_status',
    description:
      'Change a booking status (e.g. confirm, check in, check out, or cancel).',
    write: true,
    parameters: obj(
      {
        bookingId: str('Booking id (uuid)'),
        status: {
          type: 'string',
          enum: ['inquiry', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
        },
      },
      ['bookingId', 'status'],
    ),
  },
  {
    name: 'create_invoice_from_booking',
    description: 'Generate an invoice from an existing booking.',
    write: true,
    parameters: obj(
      {
        bookingId: str('Booking id (uuid)'),
        dueInDays: { type: 'number', description: 'Days until due (0 = on receipt)' },
        notes: str('Invoice notes'),
      },
      ['bookingId'],
    ),
  },
  {
    name: 'record_payment',
    description: 'Record a payment against an invoice. Amount is in cents.',
    write: true,
    parameters: obj(
      {
        invoiceId: str('Invoice id (uuid)'),
        amountCents: { type: 'number', description: 'Amount in cents (e.g. 6500 = $65.00)' },
        method: { type: 'string', enum: ['cash', 'etransfer', 'card', 'other'] },
        reference: str('Payment reference'),
        notes: str('Notes'),
      },
      ['invoiceId', 'amountCents', 'method'],
    ),
  },
]

export function openAiTools() {
  return toolDefs.map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }))
}

export function isWriteTool(name: string) {
  return toolDefs.find((tool) => tool.name === name)?.write ?? false
}

async function compactSnapshot() {
  const s = await getPawboardSnapshot()
  return {
    today: new Date().toISOString(),
    settings: {
      businessName: s.settings.businessName,
      timezone: s.settings.timezone,
      hstRate: s.settings.hstRate,
      boardingCapacity: s.settings.boardingCapacity,
      daycareCapacity: s.settings.daycareCapacity,
    },
    services: s.serviceTypes.map((x) => ({
      id: x.id,
      name: x.name,
      unit: x.unit,
      rateCents: x.defaultRateCents,
      active: x.active,
    })),
    owners: s.owners.map((o) => ({
      id: o.id,
      name: `${o.firstName} ${o.lastName}`,
      phone: o.phone,
      email: o.email,
      active: o.active,
    })),
    dogs: s.dogs.map((d) => ({
      id: d.id,
      name: d.name,
      ownerId: d.ownerId,
      breed: d.breed,
      size: d.size,
      active: d.active,
    })),
    bookings: s.bookings.map((b) => ({
      id: b.id,
      ownerId: b.ownerId,
      dogIds: b.dogIds,
      serviceTypeId: b.serviceTypeId,
      startAt: b.startAt,
      endAt: b.endAt,
      status: b.status,
      paymentStatus: b.paymentStatus,
      totalCents: b.quotedTotalCents,
    })),
    invoices: s.invoices.map((i) => ({
      id: i.id,
      number: i.invoiceNumber,
      ownerId: i.ownerId,
      bookingId: i.bookingId,
      status: i.status,
      totalCents: i.totalCents,
      paidCents: i.paidCents,
      balanceCents: i.balanceCents,
    })),
    metrics: s.metrics,
  }
}

/** Executes a read-only tool and returns its JSON-serializable result. */
export async function executeReadTool(name: string) {
  if (name === 'get_snapshot') return compactSnapshot()
  throw new Error(`Unknown read tool: ${name}`)
}

/** Executes a write tool after the user has confirmed it. */
export async function executeWriteTool(
  name: string,
  args: Record<string, unknown>,
) {
  switch (name) {
    case 'create_owner':
      return createOwner(ownerInputSchema.parse(args))
    case 'create_dog':
      return createDog(dogInputSchema.parse(args))
    case 'create_booking':
      return createBooking(bookingInputSchema.parse(args))
    case 'set_booking_status': {
      const status = bookingStatusEnum.parse(args.status)
      return setBookingStatus(String(args.bookingId), status)
    }
    case 'create_invoice_from_booking':
      return createInvoiceFromBooking(createInvoiceSchema.parse(args))
    case 'record_payment':
      return recordPayment(recordPaymentSchema.parse(args))
    default:
      throw new Error(`Unknown write tool: ${name}`)
  }
}

function shortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return value
  return date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
}

/**
 * Builds confirmation cards for proposed write actions, resolving ids to names
 * and previewing booking prices using a single snapshot read.
 */
export async function describePendingActions(
  calls: Array<{ id: string; name: string; args: Record<string, JsonValue> }>,
): Promise<PendingAction[]> {
  const snapshot = await getPawboardSnapshot()
  return calls.map((call) =>
    describeAction(call.id, call.name, call.args, snapshot),
  )
}

/** Builds a human-readable confirmation card for a proposed write action. */
export function describeAction(
  id: string,
  name: string,
  args: Record<string, JsonValue>,
  snapshot?: PawboardSnapshot,
): PendingAction {
  const field = (key: string) => (args[key] ? String(args[key]) : '')
  const ownerName = (ownerId: string) => {
    const owner = snapshot?.owners.find((o) => o.id === ownerId)
    return owner ? `${owner.firstName} ${owner.lastName}` : ''
  }
  const dogList = (ids: JsonValue) =>
    (Array.isArray(ids) ? ids : [])
      .map((dogId) => snapshot?.dogs.find((d) => d.id === dogId)?.name)
      .filter(Boolean)
      .join(', ')

  let label = name
  let description = ''
  let destructive = false

  switch (name) {
    case 'create_owner':
      label = 'Create owner'
      description = `${field('firstName')} ${field('lastName')}`.trim()
      break
    case 'create_dog': {
      label = 'Add dog'
      const owner = ownerName(field('ownerId'))
      description = [field('name'), owner ? `· owner ${owner}` : '']
        .filter(Boolean)
        .join(' ')
      break
    }
    case 'create_booking': {
      const dogs = dogList(args.dogIds) || `${asArray(args.dogIds).length} dog(s)`
      const owner = ownerName(field('ownerId'))
      const service = snapshot?.serviceTypes.find(
        (s) => s.id === field('serviceTypeId'),
      )
      const dates = `${shortDate(field('startAt'))} → ${shortDate(field('endAt'))}`
      const price =
        service && snapshot
          ? calculatePriceQuote({
              service,
              startAt: field('startAt'),
              endAt: field('endAt'),
              dogCount: Math.max(1, asArray(args.dogIds).length),
              hstRate: snapshot.settings.hstRate,
            })
          : null
      label = 'Create booking'
      description = [
        dogs,
        owner ? `for ${owner}` : '',
        service ? `· ${service.name}` : '',
        `· ${dates}`,
        price ? `· ${formatMoney(price.totalCents)}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      break
    }
    case 'set_booking_status': {
      const booking = snapshot?.bookings.find((b) => b.id === field('bookingId'))
      const who = booking ? dogList(booking.dogIds) : ''
      label = 'Set booking status'
      description = [who, `→ ${field('status').replace('_', ' ')}`]
        .filter(Boolean)
        .join(' ')
      destructive = args.status === 'cancelled'
      break
    }
    case 'create_invoice_from_booking': {
      const booking = snapshot?.bookings.find((b) => b.id === field('bookingId'))
      const owner = booking ? ownerName(booking.ownerId) : ''
      label = 'Generate invoice'
      description =
        [owner, booking ? `· ${dogList(booking.dogIds)}` : '']
          .filter(Boolean)
          .join(' ') || `Booking ${field('bookingId').slice(0, 8)}…`
      break
    }
    case 'record_payment': {
      const invoice = snapshot?.invoices.find((i) => i.id === field('invoiceId'))
      const cents = Number(args.amountCents ?? 0)
      label = 'Record payment'
      description = [
        formatMoney(cents),
        `· ${field('method')}`,
        invoice ? `· ${invoice.invoiceNumber}` : '',
      ]
        .filter(Boolean)
        .join(' ')
      break
    }
  }

  return { id, name, args, label, description, destructive }
}

function asArray(value: JsonValue): JsonValue[] {
  return Array.isArray(value) ? value : []
}
