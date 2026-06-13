import type {
  BusinessSettings,
  InvoiceLineItem,
  Payment,
  ServiceType,
  ServiceUnit,
} from './pawboard'

export interface PriceInput {
  service: Pick<ServiceType, 'name' | 'unit' | 'defaultRateCents' | 'taxable'>
  startAt: string | Date
  endAt: string | Date
  dogCount: number
  hstRate: number
}

export interface PriceQuote {
  quantity: number
  unitLabel: string
  subtotalCents: number
  taxCents: number
  totalCents: number
  lineItems: InvoiceLineItem[]
  cashQuote: string
  etransferQuote: string
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value)
}

function cents(value: number) {
  return Math.round(value)
}

export function formatMoney(centsValue: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(centsValue / 100)
}

export function calculateBoardingNights(
  startAt: string | Date,
  endAt: string | Date,
) {
  const start = toDate(startAt)
  const end = toDate(endAt)
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return 0
  if (end <= start) return 0

  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  )
  const endDay = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  )
  return Math.max(1, Math.ceil((endDay - startDay) / MS_PER_DAY))
}

export function calculateDaycareDays(
  startAt: string | Date,
  endAt: string | Date,
) {
  const start = toDate(startAt)
  const end = toDate(endAt)
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return 0
  if (end < start) return 0

  const startDay = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  )
  const endDay = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
  )
  return Math.max(1, Math.floor((endDay - startDay) / MS_PER_DAY) + 1)
}

export function quantityForService(
  unit: ServiceUnit,
  startAt: string | Date,
  endAt: string | Date,
) {
  if (unit === 'night') return calculateBoardingNights(startAt, endAt)
  if (unit === 'day') return calculateDaycareDays(startAt, endAt)
  return 1
}

export function calculateTax(subtotalCents: number, hstRate: number) {
  return cents(subtotalCents * hstRate)
}

export function calculatePriceQuote(input: PriceInput): PriceQuote {
  const dogCount = Math.max(1, input.dogCount)
  const quantity = quantityForService(
    input.service.unit,
    input.startAt,
    input.endAt,
  )
  const subtotalCents = input.service.defaultRateCents * quantity * dogCount
  const taxCents = input.service.taxable
    ? calculateTax(subtotalCents, input.hstRate)
    : 0
  const totalCents = subtotalCents + taxCents
  const unitLabel =
    input.service.unit === 'night'
      ? 'night'
      : input.service.unit === 'day'
        ? 'day'
        : 'booking'

  return {
    quantity,
    unitLabel,
    subtotalCents,
    taxCents,
    totalCents,
    lineItems: [
      {
        description: `${input.service.name} × ${dogCount} dog${dogCount === 1 ? '' : 's'}`,
        quantity,
        unitLabel,
        unitPriceCents: input.service.defaultRateCents * dogCount,
        taxable: input.service.taxable,
        totalCents: subtotalCents,
      },
    ],
    cashQuote: formatMoney(totalCents),
    etransferQuote: formatMoney(totalCents),
  }
}

export function calculatePaidCents(
  payments: Array<Pick<Payment, 'amountCents'>>,
) {
  return payments.reduce((total, payment) => total + payment.amountCents, 0)
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  hstRate: number,
) {
  const subtotalCents = lineItems.reduce(
    (total, item) => total + item.totalCents,
    0,
  )
  const taxableSubtotalCents = lineItems
    .filter((item) => item.taxable)
    .reduce((total, item) => total + item.totalCents, 0)
  const taxCents = calculateTax(taxableSubtotalCents, hstRate)
  const totalCents = subtotalCents + taxCents

  return { subtotalCents, taxCents, totalCents }
}

export function calculateBalanceCents(
  totalCents: number,
  payments: Array<Pick<Payment, 'amountCents'>>,
) {
  return Math.max(0, totalCents - calculatePaidCents(payments))
}

export function generateInvoiceNumber(
  settings: Pick<BusinessSettings, 'invoicePrefix' | 'nextInvoiceNumber'>,
) {
  return `${settings.invoicePrefix}-${String(settings.nextInvoiceNumber).padStart(5, '0')}`
}
