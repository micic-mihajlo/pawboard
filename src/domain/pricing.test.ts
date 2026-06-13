import { describe, expect, it } from 'vitest'
import type { InvoiceLineItem } from './pawboard'
import {
  calculateBalanceCents,
  calculateBoardingNights,
  calculateDaycareDays,
  calculateInvoiceTotals,
  calculatePaidCents,
  calculatePriceQuote,
  calculateTax,
  generateInvoiceNumber,
} from './pricing'

const boarding = {
  name: 'Overnight boarding',
  unit: 'night' as const,
  defaultRateCents: 6500,
  taxable: true,
}
const daycare = {
  name: 'Daycare',
  unit: 'day' as const,
  defaultRateCents: 3800,
  taxable: true,
}

describe('pricing and invoice math', () => {
  it('calculates same-day daycare as one day', () => {
    expect(
      calculateDaycareDays(
        '2026-06-13T13:00:00.000Z',
        '2026-06-13T21:00:00.000Z',
      ),
    ).toBe(1)
  })

  it('calculates multi-day daycare inclusively', () => {
    expect(
      calculateDaycareDays(
        '2026-06-13T13:00:00.000Z',
        '2026-06-15T21:00:00.000Z',
      ),
    ).toBe(3)
  })

  it('calculates boarding nights by calendar nights', () => {
    expect(
      calculateBoardingNights(
        '2026-06-12T19:00:00.000Z',
        '2026-06-15T14:00:00.000Z',
      ),
    ).toBe(3)
  })

  it('keeps same-night boarding as one billable night', () => {
    expect(
      calculateBoardingNights(
        '2026-06-12T19:00:00.000Z',
        '2026-06-13T01:00:00.000Z',
      ),
    ).toBe(1)
  })

  it('calculates 13% HST and rounds to cents', () => {
    expect(calculateTax(999, 0.13)).toBe(130)
  })

  it('returns cash and e-transfer quote display', () => {
    const quote = calculatePriceQuote({
      service: daycare,
      startAt: '2026-06-13T13:00:00.000Z',
      endAt: '2026-06-13T21:00:00.000Z',
      dogCount: 1,
      hstRate: 0.13,
    })
    expect(quote.cashQuote).toBe('$42.94')
    expect(quote.etransferQuote).toBe('$42.94')
  })

  it('calculates invoice totals from taxable line items', () => {
    const lineItems: InvoiceLineItem[] = [
      {
        description: 'Boarding',
        quantity: 3,
        unitLabel: 'night',
        unitPriceCents: 6500,
        taxable: true,
        totalCents: 19500,
      },
      {
        description: 'Untaxed adjustment',
        quantity: 1,
        unitLabel: 'booking',
        unitPriceCents: 1000,
        taxable: false,
        totalCents: 1000,
      },
    ]
    expect(calculateInvoiceTotals(lineItems, 0.13)).toEqual({
      subtotalCents: 20500,
      taxCents: 2535,
      totalCents: 23035,
    })
  })

  it('calculates payments and balances', () => {
    const payments = [{ amountCents: 10000 }, { amountCents: 2590 }]
    expect(calculatePaidCents(payments)).toBe(12590)
    expect(calculateBalanceCents(22035, payments)).toBe(9445)
  })

  it('generates padded invoice numbers', () => {
    expect(
      generateInvoiceNumber({ invoicePrefix: 'PB', nextInvoiceNumber: 42 }),
    ).toBe('PB-00042')
  })

  it('prices multi-dog boarding', () => {
    const quote = calculatePriceQuote({
      service: boarding,
      startAt: '2026-06-12T19:00:00.000Z',
      endAt: '2026-06-15T14:00:00.000Z',
      dogCount: 2,
      hstRate: 0.13,
    })
    expect(quote.subtotalCents).toBe(39000)
    expect(quote.taxCents).toBe(5070)
    expect(quote.totalCents).toBe(44070)
  })
})
