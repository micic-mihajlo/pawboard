import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  Heart,
  Home,
  LockKeyhole,
  LogOut,
  PawPrint,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
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

export const Route = createFileRoute('/')({
  loader: async () => ({
    auth: await getAuthState(),
    snapshot: await getSnapshot(),
  }),
  component: PawboardApp,
})

function LoginScreen({ demoMode }: { demoMode: boolean }) {
  const router = useRouter()
  const login = useServerFn(signIn)
  const [accessCode, setAccessCode] = useState(demoMode ? 'demo' : '')
  const [error, setError] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await login({ data: { accessCode } })
    if (!result.authenticated) {
      setError(result.error)
      return
    }
    await router.invalidate()
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 px-4 text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur"
      >
        <div className="mb-6 inline-flex rounded-2xl bg-amber-200 p-3 text-amber-950">
          <LockKeyhole />
        </div>
        <h1 className="text-4xl font-black tracking-tight">
          PawBoard operator sign-in
        </h1>
        <p className="mt-3 text-stone-200">
          Use the private operator access code to open the boarding dashboard.
          Demo environments accept <strong>demo</strong>.
        </p>
        <label
          className="mt-6 block text-sm font-bold text-amber-100"
          htmlFor="access-code"
        >
          Access code
        </label>
        <input
          id="access-code"
          type="password"
          value={accessCode}
          onChange={(event) => setAccessCode(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-stone-950 outline-none ring-amber-300 focus:ring-4"
        />
        {error ? (
          <p className="mt-3 rounded-2xl bg-red-100 px-4 py-3 text-sm font-bold text-red-900">
            {error}
          </p>
        ) : null}
        <button className="mt-6 w-full rounded-2xl bg-amber-300 px-4 py-3 font-black text-amber-950 hover:bg-amber-200">
          Sign in
        </button>
      </form>
    </main>
  )
}

function SignOutButton() {
  const router = useRouter()
  const logout = useServerFn(signOut)
  return (
    <button
      onClick={async () => {
        await logout()
        await router.invalidate()
      }}
      className="no-print mb-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-stone-600 shadow-sm hover:bg-amber-50"
    >
      <LogOut size={16} /> Sign out
    </button>
  )
}

const nav = [
  ['dashboard', 'Dashboard', Home],
  ['owners', 'Owners & dogs', Users],
  ['bookings', 'Bookings', ClipboardList],
  ['calendar', 'Calendar', CalendarDays],
  ['invoices', 'Invoices', FileText],
  ['exports', 'Exports', Download],
  ['settings', 'Settings', Settings],
] as const

function PawboardApp() {
  const { auth, snapshot } = Route.useLoaderData()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => search(snapshot, query), [snapshot, query])

  if (!auth.authenticated) return <LoginScreen demoMode={auth.demoMode} />

  return (
    <div className="min-h-screen">
      <aside className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-2 py-2 shadow-2xl backdrop-blur lg:inset-y-0 lg:left-0 lg:right-auto lg:w-72 lg:border-r lg:border-t-0 lg:px-6 lg:py-8">
        <div className="mb-8 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-200 p-3 text-amber-900">
              <PawPrint />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">PawBoard</p>
              <p className="text-sm text-stone-500">Private boarding ops</p>
            </div>
          </div>
        </div>
        <nav className="grid grid-cols-7 gap-1 lg:block lg:space-y-2">
          {nav.map(([id, label, Icon]) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-semibold text-stone-600 hover:bg-amber-50 hover:text-amber-900 lg:flex-row lg:px-4 lg:py-3 lg:text-sm"
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{label}</span>
            </a>
          ))}
        </nav>
      </aside>

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:ml-72 lg:px-10 lg:pb-12">
        <SignOutButton />
        <header className="mb-8 rounded-[2rem] bg-gradient-to-br from-stone-900 via-stone-800 to-amber-900 p-6 text-white shadow-xl lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-center">
            <div>
              <p className="mb-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-amber-100">
                Today · {snapshot.settings.timezone}
              </p>
              <h1 className="text-4xl font-black tracking-tight lg:text-6xl">
                Calm dog boarding control.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-stone-200">
                Owners, dogs, bookings, invoices, payments, exports, and audit
                history in one protected app shell backed by the database
                schema.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
              <label
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-100"
                htmlFor="global-search"
              >
                <Search size={16} /> Search customers, dogs, bookings, invoices
              </label>
              <input
                id="global-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try Luna, Sarah, PB-00102..."
                className="w-full rounded-2xl border border-white/20 bg-white px-4 py-3 text-stone-900 outline-none ring-amber-300 focus:ring-4"
              />
              {query ? <SearchResults results={filtered} /> : null}
            </div>
          </div>
        </header>

        <Dashboard snapshot={snapshot} />
        <OwnersDogs snapshot={snapshot} />
        <Bookings snapshot={snapshot} />
        <Calendar snapshot={snapshot} />
        <Invoices snapshot={snapshot} />
        <Exports snapshot={snapshot} />
        <SettingsPanel snapshot={snapshot} />
      </main>
    </div>
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
    <section id="dashboard" className="scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<Home />}
        eyebrow="Daily dashboard"
        title="Open the app and know what is happening."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Monthly revenue"
          value={formatMoney(snapshot.metrics.monthlyRevenueCents)}
        />
        <Metric
          label="Unpaid invoices"
          value={formatMoney(snapshot.metrics.unpaidInvoiceTotalCents)}
          tone="warn"
        />
        <Metric
          label="Bookings this month"
          value={snapshot.metrics.bookingsThisMonth.toString()}
        />
        <Metric
          label="Dogs boarding"
          value={snapshot.metrics.dogsCurrentlyBoarding.toString()}
        />
        <Metric
          label="Upcoming this week"
          value={snapshot.metrics.upcomingBookingsThisWeek.toString()}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Board
          title="Currently staying"
          empty="No dogs are currently checked in."
          items={active}
          snapshot={snapshot}
        />
        <Board
          title="Today’s check-ins"
          empty="No check-ins today."
          items={checkIns}
          snapshot={snapshot}
        />
        <Board
          title="Today’s check-outs"
          empty="No check-outs today."
          items={checkOuts}
          snapshot={snapshot}
        />
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black">Unpaid invoices</h3>
          {unpaid.length ? (
            <div className="space-y-3">
              {unpaid.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </div>
          ) : (
            <EmptyState text="No unpaid invoices. A rare and beautiful creature." />
          )}
        </div>
      </div>
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="mb-4 font-black">Quick actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['New booking', 'New owner', 'New dog', 'New invoice'].map(
            (action) => (
              <a
                key={action}
                href="#bookings"
                className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white shadow hover:bg-amber-900"
              >
                <Plus size={18} /> {action}
              </a>
            ),
          )}
        </div>
      </div>
      <Board
        title="Upcoming bookings"
        empty="No upcoming bookings."
        items={upcoming}
        snapshot={snapshot}
      />
    </section>
  )
}

function OwnersDogs({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <section id="owners" className="mt-12 scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<Users />}
        eyebrow="Contact book"
        title="Owners and dogs stay linked."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {snapshot.owners.map((owner) => {
          const dogs = snapshot.dogs.filter((dog) => dog.ownerId === owner.id)
          return (
            <article
              key={owner.id}
              className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    {owner.firstName} {owner.lastName}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {owner.phone} · {owner.email}
                  </p>
                </div>
                <Status active={owner.active} />
              </div>
              <p className="mt-3 text-sm text-stone-600">
                Emergency: {owner.emergencyContactName} ·{' '}
                {owner.emergencyContactPhone}
              </p>
              <div className="mt-4 space-y-3">
                {dogs.map((dog) => (
                  <div key={dog.id} className="rounded-2xl bg-stone-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-black">
                        <PawPrint className="mr-2 inline" size={16} />
                        {dog.name}
                      </p>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-stone-500">
                        {dog.size}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {dog.breed} · {dog.vaccinationNotes}
                    </p>
                    <p className="mt-2 text-sm text-stone-700">
                      {dog.careNotes}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function Bookings({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <section id="bookings" className="mt-12 scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<ClipboardList />}
        eyebrow="Bookings"
        title="Create, price, check in, check out, or cancel stays."
      />
      <BookingComposer snapshot={snapshot} />
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="grid grid-cols-6 gap-3 border-b border-stone-100 bg-stone-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-stone-500">
          <span className="col-span-2">Booking</span>
          <span>Service</span>
          <span>Dates</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        {snapshot.bookings.map((booking) => (
          <BookingRow key={booking.id} snapshot={snapshot} booking={booking} />
        ))}
      </div>
    </section>
  )
}

function BookingComposer({ snapshot }: { snapshot: PawboardSnapshot }) {
  const [ownerId, setOwnerId] = useState(snapshot.owners[0]?.id ?? '')
  const ownerDogs = snapshot.dogs.filter((dog) => dog.ownerId === ownerId)
  const service = snapshot.serviceTypes[0]
  const quote = calculatePriceQuote({
    service,
    startAt: '2026-06-20T19:00:00.000Z',
    endAt: '2026-06-23T14:00:00.000Z',
    dogCount: Math.max(1, ownerDogs.length),
    hstRate: snapshot.settings.hstRate,
  })

  return (
    <div className="grid gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 lg:grid-cols-4">
      <label className="space-y-2 text-sm font-bold">
        Owner
        <select
          value={ownerId}
          onChange={(event) => setOwnerId(event.target.value)}
          className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-3"
        >
          {snapshot.owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.firstName} {owner.lastName}
            </option>
          ))}
        </select>
      </label>
      <div className="rounded-2xl bg-white p-4">
        <p className="text-sm font-bold text-stone-500">Filtered dogs</p>
        <p className="mt-1 font-black">
          {ownerDogs.map((dog) => dog.name).join(', ') || 'No active dogs'}
        </p>
      </div>
      <div className="rounded-2xl bg-white p-4">
        <p className="text-sm font-bold text-stone-500">Pricing preview</p>
        <p className="mt-1 font-black">
          {quote.quantity} {quote.unitLabel}s · {quote.cashQuote}
        </p>
      </div>
      <div className="rounded-2xl bg-stone-900 p-4 text-white">
        <p className="text-sm font-bold text-amber-100">Invoice-ready</p>
        <p className="mt-1 text-sm">
          Care notes snapshot, payment method, and tax are captured before
          saving.
        </p>
      </div>
    </div>
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
    <div className="grid grid-cols-6 gap-3 border-b border-stone-100 px-5 py-4 text-sm last:border-0">
      <div className="col-span-2">
        <p className="font-black">{dogNames(snapshot, booking.dogIds)}</p>
        <p className="text-stone-500">{ownerName(snapshot, booking.ownerId)}</p>
      </div>
      <p>{serviceName(snapshot, booking.serviceTypeId)}</p>
      <p>
        {shortDate(booking.startAt)} → {shortDate(booking.endAt)}
      </p>
      <p>
        <Badge>{booking.status.replace('_', ' ')}</Badge>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatus('checked_in')}
          className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800"
        >
          Check in
        </button>
        <button
          onClick={() => onStatus('checked_out')}
          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800"
        >
          Check out
        </button>
        <button
          onClick={() => onStatus('cancelled')}
          className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Calendar({ snapshot }: { snapshot: PawboardSnapshot }) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date('2026-06-13T12:00:00.000Z')
    date.setDate(date.getDate() + index)
    return date
  })
  return (
    <section id="calendar" className="mt-12 scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<CalendarDays />}
        eyebrow="Calendar"
        title="Visible range only, with capacity warnings."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10)
          const bookings = snapshot.bookings.filter(
            (booking) =>
              booking.startAt.slice(0, 10) <= key &&
              booking.endAt.slice(0, 10) >= key &&
              booking.status !== 'cancelled',
          )
          const dogs = bookings.reduce(
            (sum, booking) => sum + booking.dogIds.length,
            0,
          )
          return (
            <div
              key={key}
              className="min-h-40 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <p className="font-black">
                {day.toLocaleDateString('en-CA', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <p className="mb-3 text-xs font-bold text-stone-500">
                {dogs}/{snapshot.settings.boardingCapacity} dogs
              </p>
              <div className="space-y-2">
                {bookings.map((booking) => (
                  <p
                    key={booking.id}
                    className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950"
                  >
                    {dogNames(snapshot, booking.dogIds)}
                  </p>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Invoices({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <section id="invoices" className="mt-12 scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<FileText />}
        eyebrow="Invoices and payments"
        title="Professional, printable invoice records preserve snapshots."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {snapshot.invoices.map((invoice) => (
          <article
            key={invoice.id}
            className="print-card rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-stone-500">Invoice</p>
                <h3 className="text-2xl font-black">{invoice.invoiceNumber}</h3>
              </div>
              <Badge>{invoice.status}</Badge>
            </div>
            <div className="mt-5 space-y-2 text-sm">
              <p>
                <strong>Bill to:</strong> {invoice.snapshot.ownerName}
              </p>
              <p>
                <strong>Dogs:</strong> {invoice.snapshot.dogNames.join(', ')}
              </p>
              <p>
                <strong>Subtotal:</strong> {formatMoney(invoice.subtotalCents)}
              </p>
              <p>
                <strong>HST:</strong> {formatMoney(invoice.taxCents)}
              </p>
              <p className="text-lg">
                <strong>Total:</strong> {formatMoney(invoice.totalCents)}
              </p>
              <p>
                <strong>Paid:</strong> {formatMoney(invoice.paidCents)} ·{' '}
                <strong>Balance:</strong> {formatMoney(invoice.balanceCents)}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="no-print mt-5 w-full rounded-2xl bg-stone-900 px-4 py-3 font-bold text-white"
            >
              Print invoice
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}

function Exports({ snapshot }: { snapshot: PawboardSnapshot }) {
  const csvs = [
    ['Owners CSV', ownersCsv(snapshot)],
    ['Dogs CSV', dogsCsv(snapshot)],
    ['Bookings CSV', bookingsCsv(snapshot)],
    ['Invoices CSV', invoicesCsv(snapshot)],
    ['Full backup JSON', JSON.stringify(snapshot, null, 2)],
  ]
  return (
    <section id="exports" className="mt-12 scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<Download />}
        eyebrow="Data safety"
        title="CSV exports and full JSON backup are always one click away."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {csvs.map(([label, content]) => (
          <DownloadButton key={label} label={label} content={content} />
        ))}
      </div>
      <Audit snapshot={snapshot} />
    </section>
  )
}

function SettingsPanel({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <section id="settings" className="mt-12 scroll-mt-8 space-y-6">
      <SectionTitle
        icon={<Settings />}
        eyebrow="Business settings"
        title="Rates, tax, invoice numbering, and payment instructions."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black">Business profile</h3>
          {[
            ['Business', snapshot.settings.businessName],
            ['Address', snapshot.settings.address],
            ['Phone', snapshot.settings.phone],
            ['Email', snapshot.settings.email],
            ['HST', snapshot.settings.hstNumber],
            [
              'Invoice prefix',
              `${snapshot.settings.invoicePrefix} · next ${snapshot.settings.nextInvoiceNumber}`,
            ],
          ].map(([label, value]) => (
            <p key={label} className="border-b border-stone-100 py-2 text-sm">
              <strong>{label}:</strong> {value}
            </p>
          ))}
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-black">Services and rates</h3>
          {snapshot.serviceTypes.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between border-b border-stone-100 py-3 text-sm last:border-0"
            >
              <div>
                <p className="font-bold">{service.name}</p>
                <p className="text-stone-500">
                  Per {service.unit} · taxable: {service.taxable ? 'yes' : 'no'}
                </p>
              </div>
              <p className="font-black">
                {formatMoney(service.defaultRateCents)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Audit({ snapshot }: { snapshot: PawboardSnapshot }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-black">
        <ShieldCheck size={18} /> Audit history
      </h3>
      <div className="space-y-3">
        {snapshot.auditLogs.map((log) => (
          <p key={log.id} className="rounded-2xl bg-stone-50 p-3 text-sm">
            <strong>{log.action}</strong> · {log.summary}
          </p>
        ))}
      </div>
    </div>
  )
}

function SectionTitle({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-amber-800">
        {icon}
        {eyebrow}
      </p>
      <h2 className="text-3xl font-black tracking-tight lg:text-4xl">
        {title}
      </h2>
    </div>
  )
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warn'
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm ${tone === 'warn' ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'}`}
    >
      <p className="text-sm font-bold text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  )
}

function Board({
  title,
  empty,
  items,
  snapshot,
}: {
  title: string
  empty: string
  items: Booking[]
  snapshot: PawboardSnapshot
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-black">{title}</h3>
      {items.length ? (
        <div className="space-y-3">
          {items.map((booking) => (
            <a
              key={booking.id}
              href="#bookings"
              className="block rounded-2xl bg-stone-50 p-4 hover:bg-amber-50"
            >
              <p className="font-black">{dogNames(snapshot, booking.dogIds)}</p>
              <p className="text-sm text-stone-500">
                {ownerName(snapshot, booking.ownerId)} ·{' '}
                {serviceName(snapshot, booking.serviceTypeId)} ·{' '}
                {shortDate(booking.startAt)}
              </p>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState text={empty} />
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 p-5 text-sm font-semibold text-stone-500">
      <Heart className="mb-2" size={18} />
      {text}
    </div>
  )
}

function Status({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-black ${active ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-500'}`}
    >
      {active ? 'active' : 'inactive'}
    </span>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black capitalize text-stone-700">
      {children}
    </span>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <a
      href="#invoices"
      className="block rounded-2xl bg-stone-50 p-4 hover:bg-amber-50"
    >
      <p className="font-black">
        {invoice.invoiceNumber} · {invoice.snapshot.ownerName}
      </p>
      <p className="text-sm text-stone-500">
        Balance {formatMoney(invoice.balanceCents)}
      </p>
    </a>
  )
}

function SearchResults({ results }: { results: ReturnType<typeof search> }) {
  return (
    <div className="mt-3 max-h-72 overflow-auto rounded-2xl bg-stone-950/80 p-3 text-sm text-white">
      {results.length ? (
        results.map((result) => (
          <a
            key={result.href + result.title}
            href={result.href}
            className="block rounded-xl px-3 py-2 hover:bg-white/10"
          >
            <strong>{result.type}</strong> · {result.title}
            <br />
            <span className="text-stone-300">{result.detail}</span>
          </a>
        ))
      ) : (
        <p className="px-3 py-2 text-stone-300">No matches yet.</p>
      )}
    </div>
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
    const blob = new Blob([content], {
      type: label.endsWith('JSON') ? 'application/json' : 'text/csv',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download =
      label.toLowerCase().replaceAll(' ', '-') +
      (label.endsWith('JSON') ? '.json' : '.csv')
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button
      onClick={download}
      className="rounded-3xl border border-stone-200 bg-white p-5 text-left font-black shadow-sm hover:bg-amber-50"
    >
      <Download className="mb-3" />
      {label}
    </button>
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
