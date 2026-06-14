import { useState } from 'react'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { Ban, MoreHorizontal, Plus, Printer, Wallet } from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Separator } from '../../components/ui/separator'
import {
  DropdownItem,
  DropdownMenu,
} from '../../components/ui/dropdown-menu'
import { InvoiceStatusPill } from '../../components/status-pill'
import { Money } from '../../components/money'
import { EmptyState } from '../../components/empty-state'
import { ConfirmDialog } from '../../components/confirm-dialog'
import { RecordPaymentDialog } from '../../features/pawboard/components/record-payment-dialog'
import { useServerMutation } from '../../hooks/use-server-mutation'
import { voidInvoiceFn } from '../../features/pawboard/functions'
import { formatLongDate } from '../../lib/format'
import type { Invoice } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/invoices')({
  component: InvoicesPage,
})

const route = getRouteApi('/_authed')

function InvoicesPage() {
  const { snapshot } = route.useLoaderData()
  const [paymentDialog, setPaymentDialog] = useState<{
    open: boolean
    invoice?: Invoice
  }>({ open: false })
  const [voidTarget, setVoidTarget] = useState<Invoice | null>(null)
  const [voidPending, setVoidPending] = useState(false)

  const voidInvoice = useServerMutation(voidInvoiceFn, {
    successMessage: 'Invoice voided',
  })

  const runVoid = async () => {
    if (!voidTarget) return
    setVoidPending(true)
    try {
      await voidInvoice.mutate({ id: voidTarget.id })
      setVoidTarget(null)
    } catch {
      // toast surfaced by hook
    } finally {
      setVoidPending(false)
    }
  }

  const invoices = [...snapshot.invoices].sort((a, b) =>
    b.invoiceNumber.localeCompare(a.invoiceNumber),
  )

  return (
    <div className="animate-fade-up space-y-6">
      <PageHeader
        title="Invoices"
        description="Snapshots, totals, payments, and balances."
      />

      {invoices.length ? (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="print-card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{invoice.invoiceNumber}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {invoice.snapshot.ownerName}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <InvoiceStatusPill status={invoice.status} />
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="icon" className="no-print">
                        <MoreHorizontal size={16} />
                      </Button>
                    }
                  >
                    {invoice.balanceCents > 0 && invoice.status !== 'void' ? (
                      <DropdownItem
                        onSelect={() =>
                          setPaymentDialog({ open: true, invoice })
                        }
                      >
                        <Wallet size={14} /> Record payment
                      </DropdownItem>
                    ) : null}
                    <DropdownItem onSelect={() => window.print()}>
                      <Printer size={14} /> Print
                    </DropdownItem>
                    {invoice.status !== 'void' && invoice.status !== 'paid' ? (
                      <DropdownItem
                        variant="destructive"
                        onSelect={() => setVoidTarget(invoice)}
                      >
                        <Ban size={14} /> Void
                      </DropdownItem>
                    ) : null}
                  </DropdownMenu>
                </div>
              </div>

              <div className="text-muted-foreground mt-3 text-xs">
                {invoice.snapshot.dogNames.join(', ') || '—'} · issued{' '}
                {formatLongDate(invoice.issuedAt)}
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {invoice.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between gap-2">
                    <span className="text-muted-foreground min-w-0 truncate">
                      {item.description}
                    </span>
                    <Money cents={item.totalCents} />
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              <div className="space-y-1.5 text-sm">
                <Row label="Subtotal" cents={invoice.subtotalCents} />
                <Row label="HST" cents={invoice.taxCents} />
                <Row label="Total" cents={invoice.totalCents} strong />
                <Row label="Paid" cents={invoice.paidCents} muted />
                <Row
                  label="Balance"
                  cents={invoice.balanceCents}
                  strong={invoice.balanceCents > 0}
                />
              </div>

              {invoice.balanceCents > 0 && invoice.status !== 'void' ? (
                <Button
                  variant="outline"
                  className="no-print mt-4 w-full"
                  onClick={() => setPaymentDialog({ open: true, invoice })}
                >
                  <Wallet size={16} /> Record payment
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Plus}
          title="No invoices yet"
          description="Generate an invoice from a booking to see it here."
        />
      )}

      <RecordPaymentDialog
        open={paymentDialog.open}
        invoice={paymentDialog.invoice}
        onOpenChange={(open) => setPaymentDialog((s) => ({ ...s, open }))}
      />
      <ConfirmDialog
        open={!!voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        title={`Void ${voidTarget?.invoiceNumber ?? 'invoice'}?`}
        description="Voided invoices are kept for history but no longer count toward balances."
        confirmLabel="Void invoice"
        destructive
        pending={voidPending}
        onConfirm={runVoid}
      />
    </div>
  )
}

function Row({
  label,
  cents,
  strong,
  muted,
}: {
  label: string
  cents: number
  strong?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between ${strong ? 'font-semibold' : ''}`}
    >
      <span className={muted ? 'text-muted-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
      <Money cents={cents} />
    </div>
  )
}
