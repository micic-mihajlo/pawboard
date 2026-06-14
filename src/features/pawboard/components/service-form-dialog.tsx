import { useEffect, useState } from 'react'
import { Dialog } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { Checkbox } from '../../../components/ui/checkbox'
import { FormField } from '../../../components/form-field'
import { useServerMutation } from '../../../hooks/use-server-mutation'
import { upsertServiceTypeFn } from '../functions'
import { serviceTypeInputSchema } from '../schemas'
import type { ServiceType, ServiceUnit } from '../../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: ServiceType
}

const units: ServiceUnit[] = ['night', 'day', 'flat']

export function ServiceFormDialog({ open, onOpenChange, service }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState<ServiceUnit>('night')
  const [rate, setRate] = useState('')
  const [taxable, setTaxable] = useState(true)
  const [active, setActive] = useState(true)
  const [error, setError] = useState('')

  const save = useServerMutation(upsertServiceTypeFn, {
    successMessage: service ? 'Service updated' : 'Service added',
    onSuccess: () => onOpenChange(false),
  })

  useEffect(() => {
    if (open) {
      setError('')
      setName(service?.name ?? '')
      setDescription(service?.description ?? '')
      setUnit(service?.unit ?? 'night')
      setRate(service ? (service.defaultRateCents / 100).toFixed(2) : '')
      setTaxable(service?.taxable ?? true)
      setActive(service?.active ?? true)
    }
  }, [open, service])

  const submit = async () => {
    setError('')
    const payload = {
      id: service?.id,
      name,
      description,
      unit,
      defaultRateCents: Math.round(Number(rate) * 100),
      taxable,
      active,
      sortOrder: service?.sortOrder ?? 0,
    }
    const parsed = serviceTypeInputSchema.safeParse(payload)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Please check the form.')
      return
    }
    await save.mutate(parsed.data)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={service ? 'Edit service' : 'New service'}
      description="Services drive booking pricing."
      className="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={save.pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={save.pending}>
            {save.pending ? 'Saving…' : service ? 'Save changes' : 'Add service'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Name" className="sm:col-span-2" error={error}>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
        </FormField>
        <FormField label="Description" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </FormField>
        <FormField label="Unit" hint="How the rate is multiplied">
          <Select value={unit} onChange={(event) => setUnit(event.target.value as ServiceUnit)}>
            {units.map((item) => (
              <option key={item} value={item} className="capitalize">
                {item}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Rate (CAD)">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={taxable} onCheckedChange={setTaxable} />
          Taxable (HST)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={active} onCheckedChange={setActive} />
          Active
        </label>
      </div>
    </Dialog>
  )
}
