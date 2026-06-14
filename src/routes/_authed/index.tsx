import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import {
  CalendarCheck,
  DollarSign,
  Dog as DogIcon,
  LogIn,
  LogOut,
  Receipt,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { StatCard } from '../../components/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { EmptyState } from '../../components/empty-state'
import { Money } from '../../components/money'
import { BookingStatusPill } from '../../components/status-pill'
import { formatMoney } from '../../domain/pricing'
import { formatShortDate } from '../../lib/format'
import {
  dogNames,
  isActiveBooking,
  ownerName,
  serviceName,
  todaysCheckIns,
  todaysCheckOuts,
  upcomingBookings,
} from '../../features/pawboard/selectors'
import type { Booking, PawboardSnapshot } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/')({
  component: Dashboard,
})

const route = getRouteApi('/_authed')

function Dashboard() {
  const { snapshot } = route.useLoaderData()
  const now = new Date()
  const active = snapshot.bookings.filter((booking) =>
    isActiveBooking(booking, now),
  )
  const checkIns = todaysCheckIns(snapshot, now)
  const checkOuts = todaysCheckOuts(snapshot, now)
  const upcoming = upcomingBookings(snapshot, now)
  const unpaid = snapshot.invoices.filter(
    (invoice) => invoice.balanceCents > 0 && invoice.status !== 'void',
  )

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Today · ${now.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Monthly revenue"
          value={formatMoney(snapshot.metrics.monthlyRevenueCents)}
          icon={DollarSign}
          hint="Payments received this month"
        />
        <StatCard
          label="Unpaid balance"
          value={formatMoney(snapshot.metrics.unpaidInvoiceTotalCents)}
          icon={Receipt}
          hint={`${unpaid.length} open invoice${unpaid.length === 1 ? '' : 's'}`}
        />
        <StatCard
          label="Bookings this month"
          value={String(snapshot.metrics.bookingsThisMonth)}
          icon={CalendarCheck}
        />
        <StatCard
          label="Dogs boarding"
          value={String(snapshot.metrics.dogsCurrentlyBoarding)}
          icon={DogIcon}
          hint="Currently checked in"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BookingList
          title="Currently staying"
          icon={DogIcon}
          items={active}
          snapshot={snapshot}
        />
        <BookingList
          title="Today’s check-ins"
          icon={LogIn}
          items={checkIns}
          snapshot={snapshot}
        />
        <BookingList
          title="Today’s check-outs"
          icon={LogOut}
          items={checkOuts}
          snapshot={snapshot}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <BookingList
          title="Upcoming bookings"
          icon={CalendarCheck}
          items={upcoming}
          snapshot={snapshot}
          showStatus
        />
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Receipt size={15} /> Unpaid invoices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {unpaid.length ? (
              unpaid.map((invoice) => (
                <Link
                  key={invoice.id}
                  to="/invoices"
                  className="hover:bg-accent flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {invoice.snapshot.ownerName}
                    </div>
                  </div>
                  <Money cents={invoice.balanceCents} className="font-medium" />
                </Link>
              ))
            ) : (
              <EmptyState title="All settled" description="No open balances." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function BookingList({
  title,
  icon: Icon,
  items,
  snapshot,
  showStatus,
}: {
  title: string
  icon: LucideIcon
  items: Booking[]
  snapshot: PawboardSnapshot
  showStatus?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon size={15} /> {title}
          <span className="text-muted-foreground ml-auto text-xs font-normal">
            {items.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {items.length ? (
          items.map((booking) => (
            <div
              key={booking.id}
              className="rounded-md border px-3 py-2.5 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {dogNames(snapshot, booking.dogIds) || 'No dogs'}
                </span>
                {showStatus ? (
                  <BookingStatusPill status={booking.status} />
                ) : null}
              </div>
              <div className="text-muted-foreground mt-0.5 text-xs">
                {ownerName(snapshot, booking.ownerId)} ·{' '}
                {serviceName(snapshot, booking.serviceTypeId)} ·{' '}
                {formatShortDate(booking.startAt)}
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="Nothing here yet" />
        )}
      </CardContent>
    </Card>
  )
}
