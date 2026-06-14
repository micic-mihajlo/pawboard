import { useEffect, useState } from 'react'
import { Dialog } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { FormField } from '../../../components/form-field'
import { Money } from '../../../components/money'
import { useServerMutation } from '../../../hooks/use-server-mutation'
import { createInvoiceFn } from '../functions'
import { ownerName } from '../selectors'
import type { Booking, PawboardSnapshot } from '../../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  snapshot: PawboardSnapshot
  booking?: Booking
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  snapshot,
  booking,
}: Props) {
  const [dueInDays, setDueInDays] = useState('0')
  const [notes, setNotes] = useState('')

  const create = useServerMutation(createInvoiceFn, {
    successMessage: 'Invoice created',
    onSuccess: () => onOpenChange(false),
  })

  useEffect(() => {
    if (open) {
      setDueInDays('0')
      setNotes('')
    }
  }, [open])

  if (!booking) return null

  const submit = async () => {
    await create.mutate({
      bookingId: booking.id,
      dueInDays: Math.max(0, Number(dueInDays) || 0),
      notes,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generate invoice"
      description={`${ownerName(snapshot, booking.ownerId)} · quoted total below`}
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={create.pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={create.pending}>
            {create.pending ? 'Creating…' : 'Create invoice'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-muted/40 flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
          <span className="text-muted-foreground">Quoted total</span>
          <span className="font-semibold">
            <Money cents={booking.quotedTotalCents} />
          </span>
        </div>
        <FormField label="Due in (days)" hint="0 = due on receipt">
          <Input
            type="number"
            min="0"
            value={dueInDays}
            onChange={(event) => setDueInDays(event.target.value)}
          />
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </FormField>
      </div>
    </Dialog>
  )
}
