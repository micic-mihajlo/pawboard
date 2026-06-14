import { describe, expect, it } from 'vitest'
import { bookingsForDay, monthGrid, toKey, weekDays } from './calendar-utils'
import type { Booking, PawboardSnapshot } from '../../domain/pawboard'

// Local-noon ISO strings round-trip to the same local day in any timezone.
const iso = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 12).toISOString()
const dayKey = (y: number, m: number, d: number) =>
  toKey(new Date(y, m - 1, d, 12))

function booking(partial: Partial<Booking>): Booking {
  return {
    id: 'b',
    ownerId: 'o',
    dogIds: ['d1'],
    serviceTypeId: 's',
    startAt: iso(2026, 6, 10),
    endAt: iso(2026, 6, 12),
    status: 'confirmed',
    internalNotes: '',
    careNotesSnapshot: [],
    paymentMethod: 'etransfer',
    paymentStatus: 'unpaid',
    quotedSubtotalCents: 0,
    quotedTaxCents: 0,
    quotedTotalCents: 0,
    checkedInAt: null,
    checkedOutAt: null,
    createdAt: iso(2026, 6, 1),
    updatedAt: iso(2026, 6, 1),
    ...partial,
  }
}

function snapshotOf(bookings: Booking[]): PawboardSnapshot {
  return {
    settings: { boardingCapacity: 8 },
    bookings,
  } as unknown as PawboardSnapshot
}

describe('monthGrid', () => {
  it('returns 6 weeks starting on a Sunday and covers the month', () => {
    const grid = monthGrid(new Date(2026, 5, 15)) // June 2026
    expect(grid).toHaveLength(42)
    expect(grid[0].getDay()).toBe(0)
    expect(grid.some((d) => d.getMonth() === 5 && d.getDate() === 1)).toBe(true)
    expect(grid.some((d) => d.getMonth() === 5 && d.getDate() === 30)).toBe(true)
  })
})

describe('weekDays', () => {
  it('returns 7 days starting on Sunday', () => {
    const days = weekDays(new Date(2026, 5, 17)) // a Wednesday
    expect(days).toHaveLength(7)
    expect(days[0].getDay()).toBe(0)
    expect(days[6].getDay()).toBe(6)
  })
})

describe('bookingsForDay', () => {
  const bookings = [
    booking({ id: 'staying', status: 'confirmed', dogIds: ['a', 'b'], startAt: iso(2026, 6, 10), endAt: iso(2026, 6, 12) }),
    booking({ id: 'checkin', status: 'checked_in', dogIds: ['c'], startAt: iso(2026, 6, 11), endAt: iso(2026, 6, 13) }),
    booking({ id: 'checkout', status: 'checked_out', dogIds: ['d'], startAt: iso(2026, 6, 9), endAt: iso(2026, 6, 11) }),
    booking({ id: 'cancelled', status: 'cancelled', dogIds: ['e'], startAt: iso(2026, 6, 11), endAt: iso(2026, 6, 11) }),
  ]
  const result = bookingsForDay(snapshotOf(bookings), dayKey(2026, 6, 11))

  it('splits bookings into check-ins, check-outs, and staying', () => {
    expect(result.checkIns.map((b) => b.id)).toEqual(['checkin'])
    expect(result.checkOuts.map((b) => b.id)).toEqual(['checkout'])
    expect(result.staying.map((b) => b.id)).toEqual(['staying'])
  })

  it('excludes cancelled bookings', () => {
    expect(result.active.some((b) => b.id === 'cancelled')).toBe(false)
  })

  it('counts only confirmed/checked-in dogs toward occupancy', () => {
    // staying (2 confirmed) + checkin (1 checked_in); checkout is checked_out.
    expect(result.dogCount).toBe(3)
  })
})
