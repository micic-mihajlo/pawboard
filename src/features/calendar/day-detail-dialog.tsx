import { LogIn, LogOut, Moon, Plus } from 'lucide-react'
import { Dialog } from '../../components/ui/dialog'
import { Button } from '../../components/ui/button'
import { Money } from '../../components/money'
import { BookingStatusPill } from '../../components/status-pill'
import { EmptyState } from '../../components/empty-state'
import { dogNames, ownerName, serviceName } from '../pawboard/selectors'
import { formatTime } from '../../lib/format'
import { bookingsForDay } from './calendar-utils'
import type { Booking, PawboardSnapshot } from '../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayKey: string | null
  snapshot: PawboardSnapshot
  onEditBooking: (booking: Booking) => void
  onNewBooking: (dayKey: string) => void
}

function longDate(dayKey: string) {
  // dayKey is a local YYYY-MM-DD; render without timezone drift.
  const [y, m, d] = dayKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function DayDetailDialog({
  open,
  onOpenChange,
  dayKey,
  snapshot,
  onEditBooking,
  onNewBooking,
}: Props) {
  if (!dayKey) return null
  const { checkIns, checkOuts, staying, dogCount } = bookingsForDay(
    snapshot,
    dayKey,
  )
  const capacity = snapshot.settings.boardingCapacity
  const over = dogCount > capacity

  const Row = ({ booking }: { booking: Booking }) => (
    <button
      type="button"
      onClick={() => onEditBooking(booking)}
      className="hover:bg-accent flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">
          {dogNames(snapshot, booking.dogIds) || 'No dogs'}
        </div>
        <div className="text-muted-foreground truncate text-xs">
          {ownerName(snapshot, booking.ownerId)} ·{' '}
          {serviceName(snapshot, booking.serviceTypeId)}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Money cents={booking.quotedTotalCents} className="text-xs" />
        <BookingStatusPill status={booking.status} />
      </div>
    </button>
  )

  const Section = ({
    icon,
    title,
    items,
    time,
  }: {
    icon: React.ReactNode
    title: string
    items: Booking[]
    time?: (b: Booking) => string
  }) =>
    items.length ? (
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          {icon} {title} ({items.length})
        </div>
        <div className="space-y-1.5">
          {items.map((b) => (
            <div key={b.id} className="space-y-0.5">
              {time ? (
                <div className="text-muted-foreground pl-1 text-[11px]">
                  {time(b)}
                </div>
              ) : null}
              <Row booking={b} />
            </div>
          ))}
        </div>
      </div>
    ) : null

  const nothing = !checkIns.length && !checkOuts.length && !staying.length

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={longDate(dayKey)}
      description={`${dogCount} of ${capacity} boarding ${dogCount === 1 ? 'slot' : 'slots'} in use${over ? ' · over capacity' : ''}`}
      className="max-w-md"
      footer={
        <Button onClick={() => onNewBooking(dayKey)}>
          <Plus size={16} /> New booking
        </Button>
      }
    >
      <div className="space-y-5">
        {nothing ? (
          <EmptyState
            title="Nothing scheduled"
            description="No check-ins, check-outs, or stays on this day."
          />
        ) : (
          <>
            <Section
              icon={<LogIn size={13} className="text-success" />}
              title="Checking in"
              items={checkIns}
              time={(b) => formatTime(b.startAt)}
            />
            <Section
              icon={<LogOut size={13} className="text-warning" />}
              title="Checking out"
              items={checkOuts}
              time={(b) => formatTime(b.endAt)}
            />
            <Section
              icon={<Moon size={13} className="text-muted-foreground" />}
              title="Staying over"
              items={staying}
            />
          </>
        )}
      </div>
    </Dialog>
  )
}
