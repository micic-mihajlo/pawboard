import { useState } from 'react'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, LogIn, LogOut, Plus } from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { Button } from '../../components/ui/button'
import { cn } from '../../lib/utils'
import { dogNames } from '../../features/pawboard/selectors'
import { formatTime } from '../../lib/format'
import { DayDetailDialog } from '../../features/calendar/day-detail-dialog'
import { BookingFormDialog } from '../../features/pawboard/components/booking-form-dialog'
import {
  LEGEND,
  WEEKDAY_LABELS,
  addDays,
  bookingsForDay,
  isoKey,
  monthGrid,
  statusChip,
  toKey,
  weekDays,
} from '../../features/calendar/calendar-utils'
import type { Booking, PawboardSnapshot } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/calendar')({
  component: CalendarPage,
})

const route = getRouteApi('/_authed')
type View = 'month' | 'week'

function CalendarPage() {
  const { snapshot } = route.useLoaderData()
  const [view, setView] = useState<View>('month')
  const [cursor, setCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [bookingDialog, setBookingDialog] = useState<{
    open: boolean
    booking?: Booking
    defaultDate?: string
  }>({ open: false })

  const todayKey = toKey(new Date())

  const step = (dir: number) => {
    if (view === 'week') {
      setCursor((c) => addDays(c, dir * 7))
    } else {
      setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1))
    }
  }

  const title =
    view === 'month'
      ? cursor.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' })
      : rangeTitle(weekDays(cursor))

  const openEdit = (booking: Booking) => {
    setSelectedDay(null)
    setBookingDialog({ open: true, booking })
  }
  const openNew = (dayKey?: string) => {
    setSelectedDay(null)
    setBookingDialog({ open: true, defaultDate: dayKey })
  }

  return (
    <div className="animate-fade-up space-y-5">
      <PageHeader
        title="Calendar"
        description="Stays, check-ins, and check-outs at a glance"
      >
        <Button onClick={() => openNew()}>
          <Plus size={16} /> New booking
        </Button>
      </PageHeader>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Next">
            <ChevronRight size={16} />
          </Button>
          <Button variant="ghost" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <div className="ml-2 text-base font-semibold tracking-tight">{title}</div>
        </div>

        <div className="bg-muted flex items-center rounded-lg p-0.5">
          {(['month', 'week'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-3 py-1 text-sm font-medium capitalize transition-colors',
                view === v
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === 'month' ? (
        <MonthView
          cursor={cursor}
          snapshot={snapshot}
          todayKey={todayKey}
          onSelectDay={setSelectedDay}
          onEditBooking={openEdit}
        />
      ) : (
        <WeekView
          cursor={cursor}
          snapshot={snapshot}
          todayKey={todayKey}
          onEditBooking={openEdit}
          onNewBooking={openNew}
        />
      )}

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {LEGEND.map((item) => (
          <span key={item.status} className="flex items-center gap-1.5">
            <span
              className={cn(
                'inline-block size-2.5 rounded-full border',
                statusChip[item.status],
              )}
            />
            {item.label}
          </span>
        ))}
      </div>

      <DayDetailDialog
        open={!!selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
        dayKey={selectedDay}
        snapshot={snapshot}
        onEditBooking={openEdit}
        onNewBooking={openNew}
      />
      <BookingFormDialog
        open={bookingDialog.open}
        booking={bookingDialog.booking}
        defaultDate={bookingDialog.defaultDate}
        owners={snapshot.owners}
        dogs={snapshot.dogs}
        serviceTypes={snapshot.serviceTypes}
        hstRate={snapshot.settings.hstRate}
        onOpenChange={(open) => setBookingDialog((s) => ({ ...s, open }))}
      />
    </div>
  )
}

function rangeTitle(days: Date[]) {
  const first = days[0]
  const last = days[days.length - 1]
  const sameMonth = first.getMonth() === last.getMonth()
  const left = first.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  })
  const right = sameMonth
    ? String(last.getDate())
    : last.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
  return `${left} – ${right}, ${last.getFullYear()}`
}

function Chip({
  booking,
  snapshot,
  onClick,
  dayKey,
}: {
  booking: Booking
  snapshot: PawboardSnapshot
  onClick: (b: Booking) => void
  dayKey?: string
}) {
  const isIn = dayKey ? isoKey(booking.startAt) === dayKey : false
  const isOut = dayKey ? isoKey(booking.endAt) === dayKey && !isIn : false
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick(booking)
      }}
      title={dogNames(snapshot, booking.dogIds)}
      className={cn(
        'flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-xs transition-opacity hover:opacity-80',
        statusChip[booking.status],
      )}
    >
      {isIn ? <LogIn size={10} className="shrink-0" /> : null}
      {isOut ? <LogOut size={10} className="shrink-0" /> : null}
      <span className="truncate">{dogNames(snapshot, booking.dogIds) || '—'}</span>
    </button>
  )
}

function MonthView({
  cursor,
  snapshot,
  todayKey,
  onSelectDay,
  onEditBooking,
}: {
  cursor: Date
  snapshot: PawboardSnapshot
  todayKey: string
  onSelectDay: (key: string) => void
  onEditBooking: (b: Booking) => void
}) {
  const cells = monthGrid(cursor)

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted/40 grid grid-cols-7 border-b">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const key = toKey(day)
          const inMonth = day.getMonth() === cursor.getMonth()
          const isToday = key === todayKey
          const { active, dogCount } = bookingsForDay(snapshot, key)
          const ordered = [...active].sort((a, b) =>
            a.startAt.localeCompare(b.startAt),
          )
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              className={cn(
                'hover:bg-accent/40 flex min-h-[104px] flex-col gap-1 border-b border-r p-1.5 text-left transition-colors',
                index % 7 === 6 && 'border-r-0',
                !inMonth && 'bg-muted/20 text-muted-foreground',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday && 'bg-brand text-brand-foreground',
                    !isToday && !inMonth && 'text-muted-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                {dogCount > 0 ? (
                  <span className="text-muted-foreground tabular text-[10px] font-medium">
                    {dogCount} {dogCount === 1 ? 'dog' : 'dogs'}
                  </span>
                ) : null}
              </div>
              <div className="space-y-0.5">
                {ordered.slice(0, 3).map((b) => (
                  <Chip
                    key={b.id}
                    booking={b}
                    snapshot={snapshot}
                    dayKey={key}
                    onClick={onEditBooking}
                  />
                ))}
                {ordered.length > 3 ? (
                  <div className="text-muted-foreground pl-1 text-[10px]">
                    +{ordered.length - 3} more
                  </div>
                ) : null}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({
  cursor,
  snapshot,
  todayKey,
  onEditBooking,
  onNewBooking,
}: {
  cursor: Date
  snapshot: PawboardSnapshot
  todayKey: string
  onEditBooking: (b: Booking) => void
  onNewBooking: (dayKey: string) => void
}) {
  const days = weekDays(cursor)

  return (
    <div className="grid gap-2 sm:grid-cols-7">
      {days.map((day) => {
        const key = toKey(day)
        const isToday = key === todayKey
        const { active, checkIns, checkOuts, dogCount } = bookingsForDay(
          snapshot,
          key,
        )
        const ordered = [...active].sort((a, b) =>
          a.startAt.localeCompare(b.startAt),
        )
        return (
          <div
            key={key}
            className={cn(
              'flex min-h-[180px] flex-col rounded-lg border',
              isToday && 'border-brand/50 ring-brand/20 ring-2',
            )}
          >
            <div className="flex items-center justify-between border-b px-2 py-1.5">
              <div>
                <div className="text-xs font-semibold">
                  {day.toLocaleDateString('en-CA', { weekday: 'short' })}
                </div>
                <div className="text-muted-foreground text-[11px]">
                  {day.toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
              </div>
              {dogCount > 0 ? (
                <span className="bg-muted text-muted-foreground tabular rounded px-1 text-[10px] font-medium">
                  {dogCount} {dogCount === 1 ? 'dog' : 'dogs'}
                </span>
              ) : null}
            </div>
            <div className="flex-1 space-y-1 p-1.5">
              {ordered.length ? (
                ordered.map((b) => (
                  <div key={b.id} className="space-y-0.5">
                    {checkIns.includes(b) ? (
                      <div className="text-muted-foreground pl-0.5 text-[10px]">
                        in · {formatTime(b.startAt)}
                      </div>
                    ) : checkOuts.includes(b) ? (
                      <div className="text-muted-foreground pl-0.5 text-[10px]">
                        out · {formatTime(b.endAt)}
                      </div>
                    ) : null}
                    <Chip
                      booking={b}
                      snapshot={snapshot}
                      dayKey={key}
                      onClick={onEditBooking}
                    />
                  </div>
                ))
              ) : (
                <button
                  type="button"
                  onClick={() => onNewBooking(key)}
                  className="text-muted-foreground hover:bg-accent hover:text-foreground flex w-full items-center justify-center gap-1 rounded border border-dashed py-2 text-xs transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
