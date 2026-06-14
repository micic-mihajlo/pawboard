import { useEffect, useState } from 'react'
import { Dialog } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Textarea } from '../../../components/ui/textarea'
import { Checkbox } from '../../../components/ui/checkbox'
import { FormField } from '../../../components/form-field'
import { useServerMutation } from '../../../hooks/use-server-mutation'
import { createOwnerFn, updateOwnerFn } from '../functions'
import { ownerInputSchema } from '../schemas'
import type { OwnerInput } from '../schemas'
import type { Owner } from '../../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  owner?: Owner
}

function emptyOwner(): OwnerInput {
  return {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notes: '',
    active: true,
  }
}

export function OwnerFormDialog({ open, onOpenChange, owner }: Props) {
  const [values, setValues] = useState<OwnerInput>(emptyOwner())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useServerMutation(createOwnerFn, {
    successMessage: 'Owner created',
    onSuccess: () => onOpenChange(false),
  })
  const update = useServerMutation(updateOwnerFn, {
    successMessage: 'Owner updated',
    onSuccess: () => onOpenChange(false),
  })
  const pending = create.pending || update.pending

  useEffect(() => {
    if (open) {
      setErrors({})
      setValues(
        owner
          ? {
              firstName: owner.firstName,
              lastName: owner.lastName,
              phone: owner.phone,
              email: owner.email,
              address: owner.address,
              emergencyContactName: owner.emergencyContactName,
              emergencyContactPhone: owner.emergencyContactPhone,
              notes: owner.notes,
              active: owner.active,
            }
          : emptyOwner(),
      )
    }
  }, [open, owner])

  const set = <TKey extends keyof OwnerInput>(
    key: TKey,
    value: OwnerInput[TKey],
  ) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    const parsed = ownerInputSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    if (owner) {
      await update.mutate({ id: owner.id, data: parsed.data })
    } else {
      await create.mutate(parsed.data)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={owner ? 'Edit owner' : 'New owner'}
      description="Contact details and emergency information."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Saving…' : owner ? 'Save changes' : 'Create owner'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName}>
          <Input
            value={values.firstName}
            onChange={(event) => set('firstName', event.target.value)}
          />
        </FormField>
        <FormField label="Last name" error={errors.lastName}>
          <Input
            value={values.lastName}
            onChange={(event) => set('lastName', event.target.value)}
          />
        </FormField>
        <FormField label="Phone">
          <Input
            value={values.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <Input
            type="email"
            value={values.email}
            onChange={(event) => set('email', event.target.value)}
          />
        </FormField>
        <FormField label="Address" className="sm:col-span-2">
          <Input
            value={values.address}
            onChange={(event) => set('address', event.target.value)}
          />
        </FormField>
        <FormField label="Emergency contact">
          <Input
            value={values.emergencyContactName}
            onChange={(event) =>
              set('emergencyContactName', event.target.value)
            }
          />
        </FormField>
        <FormField label="Emergency phone">
          <Input
            value={values.emergencyContactPhone}
            onChange={(event) =>
              set('emergencyContactPhone', event.target.value)
            }
          />
        </FormField>
        <FormField label="Notes" className="sm:col-span-2">
          <Textarea
            value={values.notes}
            onChange={(event) => set('notes', event.target.value)}
          />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={values.active}
            onCheckedChange={(checked) => set('active', checked)}
          />
          Active
        </label>
      </div>
    </Dialog>
  )
}
