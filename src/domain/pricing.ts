import type {
  BusinessSettings,
  InvoiceLineItem,
  Payment,
  PaymentMethod,
  ServiceType,
  ServiceUnit,
} from './pawboard'

export interface PriceDog {
  name: string
  /** Effective per-unit rate for this dog (override or service base rate). */
  rateCents: number
}

export interface PriceInput {
  service: Pick<ServiceType, 'name' | 'unit' | 'defaultRateCents' | 'taxable'>
  startAt: string | Date
  endAt: string | Date
  dogs: PriceDog[]
  hstRate: number
  /** Cash is billed without HST; e-transfer/card/other include HST. */
  paymentMethod?: PaymentMethod
}

/** HST applies only when the service is taxable and payment is not cash. */
export function appliesHst(
  taxable: boolean,
  paymentMethod: PaymentMethod = 'etransfer',
) {
  return taxable && paymentMethod !== 'cash'
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
  const quantity = quantityForService(
    input.service.unit,
    input.startAt,
    input.endAt,
  )
  const unitLabel =
    input.service.unit === 'night'
      ? 'night'
      : input.service.unit === 'day'
        ? 'day'
        : 'booking'

  const dogs = input.dogs.length
    ? input.dogs
    : [{ name: '', rateCents: input.service.defaultRateCents }]

  const taxed = appliesHst(input.service.taxable, input.paymentMethod)

  const lineItems: InvoiceLineItem[] = dogs.map((dog) => ({
    description: dog.name
      ? `${input.service.name} — ${dog.name}`
      : input.service.name,
    quantity,
    unitLabel,
    unitPriceCents: dog.rateCents,
    taxable: taxed,
    totalCents: dog.rateCents * quantity,
  }))

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0)
  const taxCents = taxed ? calculateTax(subtotalCents, input.hstRate) : 0
  const totalCents = subtotalCents + taxCents

  // Both options for display, regardless of the selected method.
  const fullTax = input.service.taxable
    ? calculateTax(subtotalCents, input.hstRate)
    : 0

  return {
    quantity,
    unitLabel,
    subtotalCents,
    taxCents,
    totalCents,
    lineItems,
    cashQuote: formatMoney(subtotalCents),
    etransferQuote: formatMoney(subtotalCents + fullTax),
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
