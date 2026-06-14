import type { Booking, BookingStatus, PawboardSnapshot } from '../../domain/pawboard'

/** Local (not UTC) YYYY-MM-DD key for a date. */
export function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Local day key for an ISO timestamp. */
export function isoKey(iso: string): string {
  return toKey(new Date(iso))
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Sunday-based start of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  return addDays(d, -d.getDay())
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** 42-cell month grid (6 weeks) starting on the Sunday on/before the 1st. */
export function monthGrid(month: Date): Date[] {
  const gridStart = startOfWeek(startOfMonth(month))
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
}

export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Statuses that occupy a kennel slot for capacity purposes. */
const OCCUPYING: BookingStatus[] = ['confirmed', 'checked_in']

export interface DayBookings {
  active: Booking[]
  checkIns: Booking[]
  checkOuts: Booking[]
  staying: Booking[]
  dogCount: number
}

/** Bookings relevant to a given local day, split by check-in/out/staying. */
export function bookingsForDay(
  snapshot: PawboardSnapshot,
  dayKey: string,
): DayBookings {
  const active = snapshot.bookings.filter(
    (b) =>
      b.status !== 'cancelled' &&
      isoKey(b.startAt) <= dayKey &&
      isoKey(b.endAt) >= dayKey,
  )
  const checkIns = active.filter((b) => isoKey(b.startAt) === dayKey)
  const checkOuts = active.filter(
    (b) => isoKey(b.endAt) === dayKey && isoKey(b.startAt) !== dayKey,
  )
  const staying = active.filter(
    (b) => isoKey(b.startAt) < dayKey && isoKey(b.endAt) > dayKey,
  )
  const dogCount = active
    .filter((b) => OCCUPYING.includes(b.status))
    .reduce((sum, b) => sum + b.dogIds.length, 0)
  return { active, checkIns, checkOuts, staying, dogCount }
}

/** Tailwind classes for a booking chip by status. */
export const statusChip: Record<BookingStatus, string> = {
  inquiry: 'bg-warning/15 text-warning border-warning/30',
  confirmed: 'bg-accent text-accent-foreground border-border',
  checked_in: 'bg-success/15 text-success border-success/30',
  checked_out: 'bg-muted text-muted-foreground border-transparent',
  cancelled: 'hidden',
}

export const LEGEND: Array<{ status: BookingStatus; label: string }> = [
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'checked_in', label: 'Checked in' },
  { status: 'inquiry', label: 'Inquiry' },
  { status: 'checked_out', label: 'Checked out' },
]
