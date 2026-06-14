import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { PageHeader } from '../../components/page-header'
import { Card } from '../../components/ui/card'
import { cn } from '../../lib/utils'
import { dogNames } from '../../features/pawboard/selectors'

export const Route = createFileRoute('/_authed/calendar')({
  component: CalendarPage,
})

const route = getRouteApi('/_authed')

function CalendarPage() {
  const { snapshot } = route.useLoaderData()
  const capacity = snapshot.settings.boardingCapacity

  const start = new Date()
  start.setHours(12, 0, 0, 0)
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(start)
    date.setDate(date.getDate() + index)
    return date
  })

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Calendar"
        description={`Two-week view · boarding capacity ${capacity} dogs/night`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10)
          const dayBookings = snapshot.bookings.filter(
            (booking) =>
              booking.startAt.slice(0, 10) <= key &&
              booking.endAt.slice(0, 10) >= key &&
              booking.status !== 'cancelled' &&
              booking.status !== 'inquiry',
          )
          const dogCount = dayBookings.reduce(
            (sum, booking) => sum + booking.dogIds.length,
            0,
          )
          const isToday = key === new Date().toISOString().slice(0, 10)
          const over = dogCount > capacity

          return (
            <Card
              key={key}
              className={cn(
                'flex min-h-36 flex-col gap-2 p-3',
                isToday && 'ring-brand/40 ring-2',
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide">
                    {day.toLocaleDateString('en-CA', { weekday: 'short' })}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {day.toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
                <span
                  className={cn(
                    'tabular rounded-md px-1.5 py-0.5 text-xs font-medium',
                    over
                      ? 'bg-destructive/10 text-destructive'
                      : dogCount > 0
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {dogCount}/{capacity}
                </span>
              </div>
              <div className="space-y-1">
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="bg-muted/70 truncate rounded px-2 py-1 text-xs"
                    title={dogNames(snapshot, booking.dogIds)}
                  >
                    {dogNames(snapshot, booking.dogIds)}
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
