import { useEffect, useState } from 'react'
import { Dialog } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { FormField } from '../../../components/form-field'
import { Money } from '../../../components/money'
import { useServerMutation } from '../../../hooks/use-server-mutation'
import { recordPaymentFn } from '../functions'
import { toDateTimeLocalValue, fromInputValue } from '../../../lib/format'
import type { Invoice, PaymentMethod } from '../../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice
}

const methods: PaymentMethod[] = ['etransfer', 'cash', 'card', 'other']

export function RecordPaymentDialog({ open, onOpenChange, invoice }: Props) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('etransfer')
  const [paidAt, setPaidAt] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const record = useServerMutation(recordPaymentFn, {
    successMessage: 'Payment recorded',
    onSuccess: () => onOpenChange(false),
  })

  useEffect(() => {
    if (open && invoice) {
      setError('')
      setAmount((invoice.balanceCents / 100).toFixed(2))
      setMethod('etransfer')
      setPaidAt(toDateTimeLocalValue(new Date()))
      setReference('')
      setNotes('')
    }
  }, [open, invoice])

  if (!invoice) return null

  const submit = async () => {
    setError('')
    const amountCents = Math.round(Number(amount) * 100)
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount.')
      return
    }
    await record.mutate({
      invoiceId: invoice.id,
      amountCents,
      method,
      paidAt: fromInputValue(paidAt) || new Date().toISOString(),
      reference,
      notes,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Record payment · ${invoice.invoiceNumber}`}
      description={
        <>
          Balance due <Money cents={invoice.balanceCents} />
        </>
      }
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={record.pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={record.pending}>
            {record.pending ? 'Saving…' : 'Record payment'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount (CAD)" error={error}>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </FormField>
        <FormField label="Method">
          <Select
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
          >
            {methods.map((item) => (
              <option key={item} value={item} className="capitalize">
                {item}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Paid at" className="sm:col-span-2">
          <input
            type="datetime-local"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            className="border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </FormField>
        <FormField label="Reference" className="sm:col-span-2">
          <Input
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="e.g. e-transfer confirmation"
          />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </FormField>
      </div>
    </Dialog>
  )
}
