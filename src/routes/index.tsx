import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Home,
  LockKeyhole,
  LogOut,
  PawPrint,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Separator } from '../components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table'
import type { Booking, Invoice, PawboardSnapshot } from '../domain/pawboard'
import { calculatePriceQuote, formatMoney } from '../domain/pricing'
import { getAuthState, signIn, signOut } from '../features/auth/functions'
import { getSnapshot, setBookingStatus } from '../features/pawboard/functions'
import {
  dogNames,
  isActiveBooking,
  ownerName,
  serviceName,
  todaysCheckIns,
  todaysCheckOuts,
  upcomingBookings,
} from '../features/pawboard/selectors'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/')({
  loader: async () => ({
    auth: await getAuthState(),
    snapshot: await getSnapshot(),
  }),
  component: PawboardApp,
})

const nav = [
  ['dashboard', 'Dashboard', Home],
  ['owners', 'Owners & Dogs', Users],
  ['bookings', 'Bookings', ClipboardList],
  ['calendar', 'Calendar', CalendarDays],
  ['invoices', 'Invoices', FileText],
  ['exports', 'Exports', Download],
  ['settings', 'Settings', Settings],
] as const

function PawboardApp() {
  const { auth, snapshot } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const results = useMemo(() => search(snapshot, query), [snapshot, query])

  if (!auth.authenticated) return <LoginScreen demoMode={auth.demoMode} />

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <PawPrint size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold">PawBoard</div>
            <div className="text-xs text-muted-foreground">Operations</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon size={16} />
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <PawPrint size={18} />
            <span className="font-semibold">PawBoard</span>
          </div>
          <div className="relative ml-auto w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className="pl-9"
            />
            {query ? <SearchResults results={results} /> : null}
          </div>
          <SignOutButton />
        </header>

        <main className="flex-1 space-y-8 p-4 md:p-6 lg:p-8">
          <Dashboard snapshot={snapshot} />
          <OwnersDogs snapshot={snapshot} />
          <Bookings snapshot={snapshot} />
          <Calendar snapshot={snapshot} />
          <Invoices snapshot={snapshot} />
          <Exports snapshot={snapshot} />
          <SettingsPanel snapshot={snapshot} />
        </main>
      </div>
    </div>
  )
}

function LoginScreen({ demoMode }: { demoMode: boolean }) {
  const router = useRouter()
  const login = useServerFn(signIn)
  const [accessCode, setAccessCode] = useState(demoMode ? 'demo' : '')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await login({ data: { accessCode } })
    if (!result.authenticated) {
      setError(result.error)
      return
    }
    await router.invalidate()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LockKeyhole size={18} />
          </div>
          <CardTitle>PawBoard</CardTitle>
          <CardDescription>
            Sign in to the private operator dashboard.
            {demoMode ? ' Use demo for local preview.' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="access-code">
                Access code
              </label>
              <Input
                id="access-code"
                type="password"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

function SignOutButton() {
  const router = useRouter()
  const logout = useServerFn(signOut)
  return (
    <Button
      variant="outline"
      onClick={async () => {
        await logout()
        await router.invalidate()
      }}
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  )
}

function Dashboard({ snapshot }: { snapshot: PawboardSnapshot }) {
  const today = new Date('2026-06-13T14:00:00.000Z')
  const active = snapshot.bookings.filter((booking) =>
    isActiveBooking(booking, today),
  )
  const checkIns = todaysCheckIns(snapshot, today)
  const checkOuts = todaysCheckOuts(snapshot, today)
  const upcoming = upcomingBookings(snapshot, today)
  const unpaid = snapshot.invoices.filter((invoice) => invoice.balanceCents > 0)

  return (
    <Section
      id="dashboard"
      title="Dashboard"
      description={`Today · ${snapshot.settings.timezone}`}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Monthly revenue"
          value={formatMoney(snapshot.metrics.monthlyRevenueCents)}
        />
        <Metric
          label="Unpaid balance"
          value={formatMoney(snapshot.metrics.unpaidInvoiceTotalCents)}
        />
        <Metric
          label="Bookings this month"
          value={snapshot.metrics.bookingsThisMonth.toString()}
        />
        <Metric
          label="Dogs boarding"
          value={snapshot.metrics.dogsCurrentlyBoarding.toString()}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <BookingCard
          title="Currently staying"
          items={active}
          snapshot={snapshot}
        />
        <BookingCard
          title="Today’s check-ins"
          items={checkIns}
          snapshot={snapshot}
        />
        <BookingCard
          title="Today’s check-outs"
          items={checkOuts}
          snapshot={snapshot}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <BookingCard
          title="Upcoming bookings"
          items={upcoming}
          snapshot={snapshot}
        />
        <Card>
          <CardHeader>
            <CardTitle>Unpaid invoices</CardTitle>
            <CardDescription>Open balances</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unpaid.length ? (
              unpaid.map((invoice) => (
                <InvoiceMini key={invoice.id} invoice={invoice} />
              ))
            ) : (
              <EmptyState>No unpaid invoices.</EmptyState>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

function OwnersDogs({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <Section
      id="owners"
      title="Owners & Dogs"
      description="Owner contact details and dog care notes."
    >
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Dogs</TableHead>
              <TableHead>Emergency contact</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.owners.map((owner) => {
              const ownerDogs = snapshot.dogs.filter(
                (dog) => dog.ownerId === owner.id,
              )
              return (
                <TableRow key={owner.id}>
                  <TableCell className="font-medium">
                    {owner.firstName} {owner.lastName}
                  </TableCell>
                  <TableCell>
                    <div>{owner.phone}</div>
                    <div className="text-muted-foreground">{owner.email}</div>
                  </TableCell>
                  <TableCell>
                    {ownerDogs.map((dog) => dog.name).join(', ')}
                  </TableCell>
                  <TableCell>
                    {owner.emergencyContactName} · {owner.emergencyContactPhone}
                  </TableCell>
                  <TableCell>
                    <Badge variant={owner.active ? 'success' : 'muted'}>
                      {owner.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.dogs.map((dog) => (
          <Card key={dog.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{dog.name}</CardTitle>
                  <CardDescription>
                    {dog.breed} · {ownerName(snapshot, dog.ownerId)}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="capitalize">
                  {dog.size}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <KeyValue label="Feeding" value={dog.feedingInstructions} />
              <KeyValue label="Medication" value={dog.medicationInstructions} />
              <KeyValue label="Care notes" value={dog.careNotes} />
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}

function Bookings({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <Section
      id="bookings"
      title="Bookings"
      description="Create, price, check in, check out, and cancel stays."
    >
      <BookingComposer snapshot={snapshot} />
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dogs</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshot.bookings.map((booking) => (
              <BookingRow
                key={booking.id}
                snapshot={snapshot}
                booking={booking}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    </Section>
  )
}

function BookingComposer({ snapshot }: { snapshot: PawboardSnapshot }) {
  const [ownerId, setOwnerId] = useState(snapshot.owners[0]?.id ?? '')
  const [serviceId, setServiceId] = useState(snapshot.serviceTypes[0]?.id ?? '')
  const ownerDogs = snapshot.dogs.filter((dog) => dog.ownerId === ownerId)
  const service =
    snapshot.serviceTypes.find((item) => item.id === serviceId) ??
    snapshot.serviceTypes[0]
  const quote = calculatePriceQuote({
    service,
    startAt: '2026-06-20T19:00:00.000Z',
    endAt: '2026-06-23T14:00:00.000Z',
    dogCount: Math.max(1, ownerDogs.length),
    hstRate: snapshot.settings.hstRate,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>New booking</CardTitle>
        <CardDescription>
          Draft booking form with owner-filtered dogs and price preview.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-4">
        <Field label="Owner">
          <Select
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
          >
            {snapshot.owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.firstName} {owner.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Service">
          <Select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {snapshot.serviceTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded-md border p-3 text-sm">
          <div className="text-muted-foreground">Dogs</div>
          <div className="font-medium">
            {ownerDogs.map((dog) => dog.name).join(', ')}
          </div>
        </div>
        <div className="rounded-md border p-3 text-sm">
          <div className="text-muted-foreground">Preview</div>
          <div className="font-medium">
            {quote.quantity} {quote.unitLabel}s · {quote.cashQuote}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BookingRow({
  snapshot,
  booking,
}: {
  snapshot: PawboardSnapshot
  booking: Booking
}) {
  const router = useRouter()
  const updateStatus = useServerFn(setBookingStatus)
  const onStatus = async (status: Booking['status']) => {
    await updateStatus({ data: { id: booking.id, status } })
    await router.invalidate()
  }

  return (
    <TableRow>
      <TableCell className="font-medium">
        {dogNames(snapshot, booking.dogIds)}
      </TableCell>
      <TableCell>{ownerName(snapshot, booking.ownerId)}</TableCell>
      <TableCell>{serviceName(snapshot, booking.serviceTypeId)}</TableCell>
      <TableCell>
        {shortDate(booking.startAt)} → {shortDate(booking.endAt)}
      </TableCell>
      <TableCell>{formatMoney(booking.quotedTotalCents)}</TableCell>
      <TableCell>
        <StatusBadge status={booking.status} />
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatus('checked_in')}
          >
            Check in
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatus('checked_out')}
          >
            Check out
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStatus('cancelled')}
          >
            Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function Calendar({ snapshot }: { snapshot: PawboardSnapshot }) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date('2026-06-13T12:00:00.000Z')
    date.setDate(date.getDate() + index)
    return date
  })

  return (
    <Section
      id="calendar"
      title="Calendar"
      description="Two-week booking view with capacity counts."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10)
          const dayBookings = snapshot.bookings.filter(
            (booking) =>
              booking.startAt.slice(0, 10) <= key &&
              booking.endAt.slice(0, 10) >= key &&
              booking.status !== 'cancelled',
          )
          const dogCount = dayBookings.reduce(
            (sum, booking) => sum + booking.dogIds.length,
            0,
          )
          return (
            <Card key={key}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm">
                      {day.toLocaleDateString('en-CA', { weekday: 'short' })}
                    </CardTitle>
                    <CardDescription>
                      {day.toLocaleDateString('en-CA', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">
                    {dogCount}/{snapshot.settings.boardingCapacity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="min-h-24 space-y-2 p-4 pt-2">
                {dayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="rounded-md bg-muted px-2 py-1.5 text-xs"
                  >
                    {dogNames(snapshot, booking.dogIds)}
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </Section>
  )
}

function Invoices({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <Section
      id="invoices"
      title="Invoices"
      description="Invoice snapshots, totals, payments, and balances."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snapshot.invoices.map((invoice) => (
          <Card key={invoice.id} className="print-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{invoice.invoiceNumber}</CardTitle>
                  <CardDescription>
                    {invoice.snapshot.ownerName}
                  </CardDescription>
                </div>
                <InvoiceBadge status={invoice.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {invoice.snapshot.dogNames.join(', ')}
              </div>
              <div className="space-y-2 text-sm">
                <MoneyRow label="Subtotal" value={invoice.subtotalCents} />
                <MoneyRow label="HST" value={invoice.taxCents} />
                <Separator />
                <MoneyRow label="Total" value={invoice.totalCents} strong />
                <MoneyRow label="Paid" value={invoice.paidCents} />
                <MoneyRow
                  label="Balance"
                  value={invoice.balanceCents}
                  strong={invoice.balanceCents > 0}
                />
              </div>
              <Button
                variant="outline"
                className="no-print w-full"
                onClick={() => window.print()}
              >
                Print invoice
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  )
}

function Exports({ snapshot }: { snapshot: PawboardSnapshot }) {
  const exports = [
    ['Owners CSV', ownersCsv(snapshot)],
    ['Dogs CSV', dogsCsv(snapshot)],
    ['Bookings CSV', bookingsCsv(snapshot)],
    ['Invoices CSV', invoicesCsv(snapshot)],
    ['Backup JSON', JSON.stringify(snapshot, null, 2)],
  ]

  return (
    <Section
      id="exports"
      title="Exports"
      description="CSV exports and full JSON backup."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {exports.map(([label, content]) => (
          <DownloadButton key={label} label={label} content={content} />
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck size={18} /> Audit history
          </CardTitle>
          <CardDescription>
            Recent changes and operational events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="outline">{log.action}</Badge>
                  </TableCell>
                  <TableCell>{log.summary}</TableCell>
                  <TableCell>{shortDate(log.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Section>
  )
}

function SettingsPanel({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <Section
      id="settings"
      title="Settings"
      description="Business profile, invoice defaults, and service rates."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KeyValue label="Business" value={snapshot.settings.businessName} />
            <KeyValue label="Address" value={snapshot.settings.address} />
            <KeyValue label="Phone" value={snapshot.settings.phone} />
            <KeyValue label="Email" value={snapshot.settings.email} />
            <KeyValue label="HST" value={snapshot.settings.hstNumber} />
            <KeyValue
              label="Invoice prefix"
              value={snapshot.settings.invoicePrefix}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Services</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.serviceTypes.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">
                      {service.name}
                    </TableCell>
                    <TableCell>{service.unit}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(service.defaultRateCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function BookingCard({
  title,
  items,
  snapshot,
}: {
  title: string
  items: Booking[]
  snapshot: PawboardSnapshot
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((booking) => (
            <div key={booking.id} className="rounded-md border p-3 text-sm">
              <div className="font-medium">
                {dogNames(snapshot, booking.dogIds)}
              </div>
              <div className="text-muted-foreground">
                {ownerName(snapshot, booking.ownerId)} ·{' '}
                {serviceName(snapshot, booking.serviceTypeId)} ·{' '}
                {shortDate(booking.startAt)}
              </div>
            </div>
          ))
        ) : (
          <EmptyState>No items.</EmptyState>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const variant =
    status === 'checked_in'
      ? 'success'
      : status === 'cancelled'
        ? 'muted'
        : status === 'inquiry'
          ? 'warning'
          : 'outline'
  return (
    <Badge variant={variant} className="capitalize">
      {status.replace('_', ' ')}
    </Badge>
  )
}

function InvoiceBadge({ status }: { status: Invoice['status'] }) {
  return (
    <Badge
      variant={
        status === 'paid'
          ? 'success'
          : status === 'sent'
            ? 'warning'
            : 'outline'
      }
      className="capitalize"
    >
      {status}
    </Badge>
  )
}

function InvoiceMini({ invoice }: { invoice: Invoice }) {
  return (
    <div className="rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium">{invoice.invoiceNumber}</div>
        <div>{formatMoney(invoice.balanceCents)}</div>
      </div>
      <div className="text-muted-foreground">{invoice.snapshot.ownerName}</div>
    </div>
  )
}

function MoneyRow({
  label,
  value,
  strong,
}: {
  label: string
  value: number
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        strong && 'font-medium',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span>{formatMoney(value)}</span>
    </div>
  )
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div>{value || '—'}</div>
    </div>
  )
}

function SearchResults({ results }: { results: ReturnType<typeof search> }) {
  return (
    <Card className="absolute right-0 top-12 z-40 w-full shadow-lg">
      <CardContent className="p-2">
        {results.length ? (
          results.map((result) => (
            <a
              key={result.href + result.title}
              href={result.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
            >
              <div className="font-medium">{result.title}</div>
              <div className="text-xs text-muted-foreground">
                {result.type} · {result.detail}
              </div>
            </a>
          ))
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            No results
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DownloadButton({
  label,
  content,
}: {
  label: string
  content: string
}) {
  const download = () => {
    const isJson = label.endsWith('JSON')
    const blob = new Blob([content], {
      type: isJson ? 'application/json' : 'text/csv',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download =
      label.toLowerCase().replaceAll(' ', '-') + (isJson ? '.json' : '.csv')
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <Button variant="outline" onClick={download}>
      <Download size={16} />
      {label}
    </Button>
  )
}

function search(snapshot: PawboardSnapshot, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return [
    ...snapshot.owners.map((owner) => ({
      type: 'Owner',
      title: `${owner.firstName} ${owner.lastName}`,
      detail: `${owner.phone} ${owner.email}`,
      href: '#owners',
    })),
    ...snapshot.dogs.map((dog) => ({
      type: 'Dog',
      title: dog.name,
      detail: `${dog.breed} · ${ownerName(snapshot, dog.ownerId)}`,
      href: '#owners',
    })),
    ...snapshot.bookings.map((booking) => ({
      type: 'Booking',
      title: dogNames(snapshot, booking.dogIds),
      detail: `${booking.status} · ${shortDate(booking.startAt)}`,
      href: '#bookings',
    })),
    ...snapshot.invoices.map((invoice) => ({
      type: 'Invoice',
      title: invoice.invoiceNumber,
      detail: `${invoice.snapshot.ownerName} · ${formatMoney(invoice.balanceCents)} balance`,
      href: '#invoices',
    })),
  ]
    .filter((item) =>
      `${item.type} ${item.title} ${item.detail}`.toLowerCase().includes(q),
    )
    .slice(0, 8)
}

function csv(rows: string[][]) {
  return rows
    .map((row) =>
      row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','),
    )
    .join('\n')
}

function ownersCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['First name', 'Last name', 'Phone', 'Email'],
    ...snapshot.owners.map((owner) => [
      owner.firstName,
      owner.lastName,
      owner.phone,
      owner.email,
    ]),
  ])
}

function dogsCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['Name', 'Owner', 'Breed', 'Care notes'],
    ...snapshot.dogs.map((dog) => [
      dog.name,
      ownerName(snapshot, dog.ownerId),
      dog.breed,
      dog.careNotes,
    ]),
  ])
}

function bookingsCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['Owner', 'Dogs', 'Service', 'Start', 'End', 'Status', 'Total'],
    ...snapshot.bookings.map((booking) => [
      ownerName(snapshot, booking.ownerId),
      dogNames(snapshot, booking.dogIds),
      serviceName(snapshot, booking.serviceTypeId),
      booking.startAt,
      booking.endAt,
      booking.status,
      formatMoney(booking.quotedTotalCents),
    ]),
  ])
}

function invoicesCsv(snapshot: PawboardSnapshot) {
  return csv([
    ['Invoice', 'Owner', 'Status', 'Total', 'Paid', 'Balance'],
    ...snapshot.invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.snapshot.ownerName,
      invoice.status,
      formatMoney(invoice.totalCents),
      formatMoney(invoice.paidCents),
      formatMoney(invoice.balanceCents),
    ]),
  ])
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  })
}
