import { useMemo, useState } from 'react'
import { createFileRoute, getRouteApi, useNavigate } from '@tanstack/react-router'
import {
  CheckCircle2,
  FileText,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Select } from '../../components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
} from '../../components/ui/dropdown-menu'
import {
  BookingStatusPill,
  PaymentStatusPill,
} from '../../components/status-pill'
import { Money } from '../../components/money'
import { EmptyState } from '../../components/empty-state'
import { ConfirmDialog } from '../../components/confirm-dialog'
import { BookingFormDialog } from '../../features/pawboard/components/booking-form-dialog'
import { CreateInvoiceDialog } from '../../features/pawboard/components/create-invoice-dialog'
import { useServerMutation } from '../../hooks/use-server-mutation'
import {
  deleteBookingFn,
  setBookingStatusFn,
} from '../../features/pawboard/functions'
import {
  dogNames,
  ownerName,
  serviceName,
} from '../../features/pawboard/selectors'
import { formatShortDate } from '../../lib/format'
import type { Booking, BookingStatus } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/bookings')({
  component: BookingsPage,
})

const route = getRouteApi('/_authed')

const filters: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'checked_in', label: 'Checked in' },
  { value: 'checked_out', label: 'Checked out' },
  { value: 'cancelled', label: 'Cancelled' },
]

function BookingsPage() {
  const { snapshot } = route.useLoaderData()
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  const [bookingDialog, setBookingDialog] = useState<{
    open: boolean
    booking?: Booking
  }>({ open: false })
  const [invoiceDialog, setInvoiceDialog] = useState<{
    open: boolean
    booking?: Booking
  }>({ open: false })
  const [confirm, setConfirm] = useState<{
    booking: Booking
  } | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  const status = useServerMutation(setBookingStatusFn)
  const remove = useServerMutation(deleteBookingFn, {
    successMessage: 'Booking deleted',
  })

  const rows = useMemo(
    () =>
      [...snapshot.bookings]
        .filter((booking) => filter === 'all' || booking.status === filter)
        .sort((a, b) => b.startAt.localeCompare(a.startAt)),
    [snapshot.bookings, filter],
  )

  const invoiceForBooking = (bookingId: string) =>
    snapshot.invoices.find((invoice) => invoice.bookingId === bookingId)

  const setStatus = (booking: Booking, value: BookingStatus) =>
    status.mutate({ id: booking.id, status: value })

  const runDelete = async () => {
    if (!confirm) return
    setConfirmPending(true)
    try {
      await remove.mutate({ id: confirm.booking.id })
      setConfirm(null)
    } catch {
      // toast surfaced by hook
    } finally {
      setConfirmPending(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Bookings"
        description="Create, price, check in/out, and invoice stays."
      >
        <Select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="h-9 w-auto"
        >
          {filters.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        <Button onClick={() => setBookingDialog({ open: true })}>
          <Plus size={16} /> New booking
        </Button>
      </PageHeader>

      <Card className="overflow-hidden">
        {rows.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Dogs</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((booking) => {
                const invoice = invoiceForBooking(booking.id)
                return (
                  <TableRow key={booking.id}>
                    <TableCell className="pl-4 font-medium">
                      {dogNames(snapshot, booking.dogIds) || '—'}
                    </TableCell>
                    <TableCell>{ownerName(snapshot, booking.ownerId)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {serviceName(snapshot, booking.serviceTypeId)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {formatShortDate(booking.startAt)} →{' '}
                      {formatShortDate(booking.endAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Money cents={booking.quotedTotalCents} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusPill status={booking.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      <BookingStatusPill status={booking.status} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal size={16} />
                          </Button>
                        }
                      >
                        <DropdownItem
                          onSelect={() =>
                            setBookingDialog({ open: true, booking })
                          }
                        >
                          <Pencil size={14} /> Edit
                        </DropdownItem>
                        {booking.status !== 'confirmed' &&
                        booking.status !== 'checked_in' &&
                        booking.status !== 'checked_out' ? (
                          <DropdownItem
                            onSelect={() => setStatus(booking, 'confirmed')}
                          >
                            <CheckCircle2 size={14} /> Confirm
                          </DropdownItem>
                        ) : null}
                        {booking.status !== 'checked_in' &&
                        booking.status !== 'checked_out' ? (
                          <DropdownItem
                            onSelect={() => setStatus(booking, 'checked_in')}
                          >
                            <LogIn size={14} /> Check in
                          </DropdownItem>
                        ) : null}
                        {booking.status === 'checked_in' ? (
                          <DropdownItem
                            onSelect={() => setStatus(booking, 'checked_out')}
                          >
                            <LogOut size={14} /> Check out
                          </DropdownItem>
                        ) : null}
                        <DropdownSeparator />
                        {invoice ? (
                          <DropdownItem
                            onSelect={() => navigate({ to: '/invoices' })}
                          >
                            <FileText size={14} /> View invoice
                          </DropdownItem>
                        ) : (
                          <DropdownItem
                            onSelect={() =>
                              setInvoiceDialog({ open: true, booking })
                            }
                          >
                            <FileText size={14} /> Generate invoice
                          </DropdownItem>
                        )}
                        {booking.status !== 'cancelled' ? (
                          <DropdownItem
                            onSelect={() => setStatus(booking, 'cancelled')}
                          >
                            <XCircle size={14} /> Cancel
                          </DropdownItem>
                        ) : null}
                        <DropdownItem
                          variant="destructive"
                          onSelect={() => setConfirm({ booking })}
                        >
                          <Trash2 size={14} /> Delete
                        </DropdownItem>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No bookings"
              description={
                filter === 'all'
                  ? 'Create the first booking to get started.'
                  : 'No bookings match this filter.'
              }
              action={
                <Button onClick={() => setBookingDialog({ open: true })}>
                  <Plus size={16} /> New booking
                </Button>
              }
            />
          </div>
        )}
      </Card>

      <BookingFormDialog
        open={bookingDialog.open}
        booking={bookingDialog.booking}
        owners={snapshot.owners}
        dogs={snapshot.dogs}
        serviceTypes={snapshot.serviceTypes}
        hstRate={snapshot.settings.hstRate}
        onOpenChange={(open) => setBookingDialog((s) => ({ ...s, open }))}
      />
      <CreateInvoiceDialog
        open={invoiceDialog.open}
        booking={invoiceDialog.booking}
        snapshot={snapshot}
        onOpenChange={(open) => setInvoiceDialog((s) => ({ ...s, open }))}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Delete booking?"
        description="This removes the booking and detaches any invoice."
        confirmLabel="Delete booking"
        destructive
        pending={confirmPending}
        onConfirm={runDelete}
      />
    </div>
  )
}
