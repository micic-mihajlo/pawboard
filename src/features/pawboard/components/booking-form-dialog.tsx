import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { Checkbox } from '../../../components/ui/checkbox'
import { FormField } from '../../../components/form-field'
import { Money } from '../../../components/money'
import { useServerMutation } from '../../../hooks/use-server-mutation'
import { createBookingFn, updateBookingFn } from '../functions'
import { bookingInputSchema } from '../schemas'
import { calculatePriceQuote } from '../../../domain/pricing'
import { toDateTimeLocalValue, fromInputValue } from '../../../lib/format'
import type {
  Booking,
  Dog,
  Owner,
  PaymentMethod,
  ServiceType,
} from '../../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  owners: Owner[]
  dogs: Dog[]
  serviceTypes: ServiceType[]
  hstRate: number
  booking?: Booking
  /** Local YYYY-MM-DD to prefill the start date when creating a new booking. */
  defaultDate?: string
}

interface FormState {
  ownerId: string
  serviceTypeId: string
  dogIds: string[]
  startAt: string
  endAt: string
  status: Booking['status']
  paymentMethod: PaymentMethod
  internalNotes: string
}

const statuses: Booking['status'][] = [
  'inquiry',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
]
const methods: PaymentMethod[] = ['etransfer', 'cash', 'card', 'other']

function defaultRange(baseDate?: string) {
  const start =
    baseDate && /^\d{4}-\d{2}-\d{2}$/.test(baseDate)
      ? new Date(`${baseDate}T17:00`)
      : new Date()
  start.setHours(17, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  end.setHours(11, 0, 0, 0)
  return {
    startAt: toDateTimeLocalValue(start),
    endAt: toDateTimeLocalValue(end),
  }
}

export function BookingFormDialog({
  open,
  onOpenChange,
  owners,
  dogs,
  serviceTypes,
  hstRate,
  booking,
  defaultDate,
}: Props) {
  const buildInitial = (): FormState => {
    if (booking) {
      return {
        ownerId: booking.ownerId,
        serviceTypeId: booking.serviceTypeId,
        dogIds: booking.dogIds,
        startAt: toDateTimeLocalValue(booking.startAt),
        endAt: toDateTimeLocalValue(booking.endAt),
        status: booking.status,
        paymentMethod: booking.paymentMethod,
        internalNotes: booking.internalNotes,
      }
    }
    const range = defaultRange(defaultDate)
    return {
      ownerId: owners[0]?.id ?? '',
      serviceTypeId: serviceTypes[0]?.id ?? '',
      dogIds: [],
      ...range,
      status: 'confirmed',
      paymentMethod: 'etransfer',
      internalNotes: '',
    }
  }

  const [values, setValues] = useState<FormState>(buildInitial)
  const [error, setError] = useState('')

  const create = useServerMutation(createBookingFn, {
    successMessage: 'Booking created',
    onSuccess: () => onOpenChange(false),
  })
  const update = useServerMutation(updateBookingFn, {
    successMessage: 'Booking updated',
    onSuccess: () => onOpenChange(false),
  })
  const pending = create.pending || update.pending

  useEffect(() => {
    if (open) {
      setError('')
      setValues(buildInitial())
    }
    // buildInitial is recomputed each render; only re-init when reopened.
  }, [open, booking, defaultDate])

  const ownerDogs = useMemo(
    () => dogs.filter((dog) => dog.ownerId === values.ownerId),
    [dogs, values.ownerId],
  )
  const service = serviceTypes.find((item) => item.id === values.serviceTypeId)
  const selectedDogs = ownerDogs.filter((dog) =>
    values.dogIds.includes(dog.id),
  )

  const quote =
    service && values.startAt && values.endAt
      ? calculatePriceQuote({
          service,
          startAt: values.startAt,
          endAt: values.endAt,
          dogs: selectedDogs.map((dog) => ({
            name: dog.name,
            rateCents: dog.customRateCents ?? service.defaultRateCents,
          })),
          hstRate,
          paymentMethod: values.paymentMethod,
        })
      : null

  const set = <TKey extends keyof FormState>(
    key: TKey,
    value: FormState[TKey],
  ) =>
    setValues((current) => ({ ...current, [key]: value }))

  const toggleDog = (id: string) =>
    setValues((current) => ({
      ...current,
      dogIds: current.dogIds.includes(id)
        ? current.dogIds.filter((value) => value !== id)
        : [...current.dogIds, id],
    }))

  const onOwnerChange = (ownerId: string) =>
    setValues((current) => ({ ...current, ownerId, dogIds: [] }))

  const submit = async () => {
    setError('')
    const payload = {
      ...values,
      startAt: fromInputValue(values.startAt),
      endAt: fromInputValue(values.endAt),
    }
    const parsed = bookingInputSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    if (booking) {
      await update.mutate({ id: booking.id, data: parsed.data })
    } else {
      await create.mutate(parsed.data)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={booking ? 'Edit booking' : 'New booking'}
      description="Select dogs, dates, and service to price the stay."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Saving…' : booking ? 'Save changes' : 'Create booking'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Owner">
          <Select value={values.ownerId} onChange={(e) => onOwnerChange(e.target.value)}>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.firstName} {owner.lastName}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Service">
          <Select
            value={values.serviceTypeId}
            onChange={(e) => set('serviceTypeId', e.target.value)}
          >
            {serviceTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Dogs" className="sm:col-span-2">
          {ownerDogs.length ? (
            <div className="flex flex-wrap gap-2">
              {ownerDogs.map((dog) => {
                const selected = values.dogIds.includes(dog.id)
                return (
                  <button
                    key={dog.id}
                    type="button"
                    onClick={() => toggleDog(dog.id)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Checkbox checked={selected} onCheckedChange={() => toggleDog(dog.id)} />
                    {dog.name}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              This owner has no dogs yet.
            </p>
          )}
        </FormField>

        <FormField label="Start">
          <input
            type="datetime-local"
            value={values.startAt}
            onChange={(e) => set('startAt', e.target.value)}
            className="border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </FormField>
        <FormField label="End">
          <input
            type="datetime-local"
            value={values.endAt}
            onChange={(e) => set('endAt', e.target.value)}
            className="border-input bg-background h-10 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </FormField>

        <FormField label="Status">
          <Select value={values.status} onChange={(e) => set('status', e.target.value as Booking['status'])}>
            {statuses.map((status) => (
              <option key={status} value={status} className="capitalize">
                {status.replace('_', ' ')}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Payment method">
          <Select
            value={values.paymentMethod}
            onChange={(e) => set('paymentMethod', e.target.value as PaymentMethod)}
          >
            {methods.map((method) => (
              <option key={method} value={method} className="capitalize">
                {method}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Internal notes" className="sm:col-span-2">
          <Textarea
            value={values.internalNotes}
            onChange={(e) => set('internalNotes', e.target.value)}
          />
        </FormField>

        {quote ? (
          <div className="bg-muted/40 sm:col-span-2 space-y-1.5 rounded-lg border px-4 py-3 text-sm">
            <div className="text-muted-foreground flex items-center justify-between">
              <span>
                {quote.quantity} {quote.unitLabel}
                {quote.quantity === 1 ? '' : 's'} ·{' '}
                {Math.max(1, values.dogIds.length)} dog
                {values.dogIds.length === 1 ? '' : 's'}
              </span>
              <Money cents={quote.subtotalCents} />
            </div>
            {quote.taxCents > 0 ? (
              <div className="text-muted-foreground flex items-center justify-between">
                <span>HST</span>
                <Money cents={quote.taxCents} />
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t pt-1.5 font-semibold">
              <span>
                Total{' '}
                <span className="text-muted-foreground font-normal capitalize">
                  ({values.paymentMethod})
                </span>
              </span>
              <Money cents={quote.totalCents} />
            </div>
            <div className="text-muted-foreground pt-0.5 text-xs">
              Cash {quote.cashQuote} · E-transfer {quote.etransferQuote} (incl.
              HST)
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="text-destructive sm:col-span-2 text-sm">{error}</p>
        ) : null}
      </div>
    </Dialog>
  )
}
