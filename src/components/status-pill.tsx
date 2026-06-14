import { cn } from '../lib/utils'
import { titleCase } from '../lib/format'
import type {
  BookingStatus,
  InvoiceStatus,
  PaymentStatus,
} from '../domain/pawboard'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const toneStyles: Record<Tone, string> = {
  neutral: 'text-muted-foreground bg-muted/60 [&>span]:bg-muted-foreground/60',
  success:
    'text-success bg-success/10 border-success/20 [&>span]:bg-success',
  warning:
    'text-warning bg-warning/10 border-warning/25 [&>span]:bg-warning',
  danger:
    'text-destructive bg-destructive/10 border-destructive/20 [&>span]:bg-destructive',
  info: 'text-foreground bg-accent [&>span]:bg-foreground/60',
}

export function StatusPill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        toneStyles[tone],
      )}
    >
      <span className="size-1.5 rounded-full" aria-hidden />
      {label}
    </span>
  )
}

const bookingTone: Record<BookingStatus, Tone> = {
  inquiry: 'warning',
  confirmed: 'info',
  checked_in: 'success',
  checked_out: 'neutral',
  cancelled: 'danger',
}

export function BookingStatusPill({ status }: { status: BookingStatus }) {
  return <StatusPill tone={bookingTone[status]} label={titleCase(status)} />
}

const invoiceTone: Record<InvoiceStatus, Tone> = {
  draft: 'neutral',
  sent: 'warning',
  paid: 'success',
  void: 'danger',
}

export function InvoiceStatusPill({ status }: { status: InvoiceStatus }) {
  return <StatusPill tone={invoiceTone[status]} label={titleCase(status)} />
}

const paymentTone: Record<PaymentStatus, Tone> = {
  unpaid: 'danger',
  partial: 'warning',
  paid: 'success',
  refunded: 'neutral',
}

export function PaymentStatusPill({ status }: { status: PaymentStatus }) {
  return <StatusPill tone={paymentTone[status]} label={titleCase(status)} />
}
