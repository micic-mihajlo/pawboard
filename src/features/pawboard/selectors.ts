import type { Booking, PawboardSnapshot } from '../../domain/pawboard'

export function ownerName(snapshot: PawboardSnapshot, ownerId: string) {
  const owner = snapshot.owners.find((item) => item.id === ownerId)
  return owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown owner'
}

export function dogNames(snapshot: PawboardSnapshot, dogIds: string[]) {
  return dogIds
    .map((id) => snapshot.dogs.find((dog) => dog.id === id)?.name)
    .filter(Boolean)
    .join(', ')
}

export function serviceName(snapshot: PawboardSnapshot, serviceTypeId: string) {
  return (
    snapshot.serviceTypes.find((service) => service.id === serviceTypeId)
      ?.name ?? 'Unknown service'
  )
}

export function isActiveBooking(booking: Booking, now = new Date()) {
  const start = new Date(booking.startAt)
  const end = new Date(booking.endAt)
  return (
    ['confirmed', 'checked_in'].includes(booking.status) &&
    start <= now &&
    end >= now
  )
}

export function todaysCheckIns(snapshot: PawboardSnapshot, today = new Date()) {
  const key = today.toISOString().slice(0, 10)
  return snapshot.bookings.filter(
    (booking) =>
      booking.startAt.slice(0, 10) === key && booking.status !== 'cancelled',
  )
}

export function todaysCheckOuts(
  snapshot: PawboardSnapshot,
  today = new Date(),
) {
  const key = today.toISOString().slice(0, 10)
  return snapshot.bookings.filter(
    (booking) =>
      booking.endAt.slice(0, 10) === key && booking.status !== 'cancelled',
  )
}

export function upcomingBookings(snapshot: PawboardSnapshot, now = new Date()) {
  return snapshot.bookings
    .filter(
      (booking) =>
        new Date(booking.startAt) >= now && booking.status !== 'cancelled',
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt))
    .slice(0, 6)
}
