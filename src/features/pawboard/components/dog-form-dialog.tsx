import { useEffect, useState } from 'react'
import { Dialog } from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { Select } from '../../../components/ui/select'
import { Textarea } from '../../../components/ui/textarea'
import { Checkbox } from '../../../components/ui/checkbox'
import { FormField } from '../../../components/form-field'
import { useServerMutation } from '../../../hooks/use-server-mutation'
import { createDogFn, updateDogFn } from '../functions'
import { dogInputSchema } from '../schemas'
import type { DogInput } from '../schemas'
import type { Dog, Owner } from '../../../domain/pawboard'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  owners: Owner[]
  dog?: Dog
  defaultOwnerId?: string
}

const sizes = ['small', 'medium', 'large', 'giant'] as const
const sexes = ['female', 'male', 'unknown'] as const

function emptyDog(ownerId: string): DogInput {
  return {
    ownerId,
    name: '',
    breed: '',
    birthday: '',
    approximateAge: '',
    size: 'medium',
    sex: 'unknown',
    spayedNeutered: false,
    vetName: '',
    vetPhone: '',
    vaccinationNotes: '',
    feedingInstructions: '',
    medicationInstructions: '',
    behaviourNotes: '',
    compatibilityNotes: '',
    careNotes: '',
    active: true,
  }
}

export function DogFormDialog({
  open,
  onOpenChange,
  owners,
  dog,
  defaultOwnerId,
}: Props) {
  const [values, setValues] = useState<DogInput>(
    emptyDog(defaultOwnerId ?? owners[0]?.id ?? ''),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const create = useServerMutation(createDogFn, {
    successMessage: 'Dog added',
    onSuccess: () => onOpenChange(false),
  })
  const update = useServerMutation(updateDogFn, {
    successMessage: 'Dog updated',
    onSuccess: () => onOpenChange(false),
  })
  const pending = create.pending || update.pending

  useEffect(() => {
    if (open) {
      setErrors({})
      setValues(
        dog
          ? {
              ownerId: dog.ownerId,
              name: dog.name,
              breed: dog.breed,
              birthday: dog.birthday,
              approximateAge: dog.approximateAge,
              size: dog.size,
              sex: dog.sex,
              spayedNeutered: dog.spayedNeutered,
              vetName: dog.vetName,
              vetPhone: dog.vetPhone,
              vaccinationNotes: dog.vaccinationNotes,
              feedingInstructions: dog.feedingInstructions,
              medicationInstructions: dog.medicationInstructions,
              behaviourNotes: dog.behaviourNotes,
              compatibilityNotes: dog.compatibilityNotes,
              careNotes: dog.careNotes,
              active: dog.active,
            }
          : emptyDog(defaultOwnerId ?? owners[0]?.id ?? ''),
      )
    }
  }, [open, dog, defaultOwnerId, owners])

  const set = <TKey extends keyof DogInput>(
    key: TKey,
    value: DogInput[TKey],
  ) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = async () => {
    const parsed = dogInputSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message
      }
      setErrors(fieldErrors)
      return
    }
    if (dog) {
      await update.mutate({ id: dog.id, data: parsed.data })
    } else {
      await create.mutate(parsed.data)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={dog ? `Edit ${dog.name}` : 'New dog'}
      description="Profile, vet, and care instructions."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? 'Saving…' : dog ? 'Save changes' : 'Add dog'}
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Owner" className="sm:col-span-2" error={errors.ownerId}>
          <Select
            value={values.ownerId}
            onChange={(event) => set('ownerId', event.target.value)}
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.firstName} {owner.lastName}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Name" error={errors.name}>
          <Input value={values.name} onChange={(e) => set('name', e.target.value)} />
        </FormField>
        <FormField label="Breed">
          <Input value={values.breed} onChange={(e) => set('breed', e.target.value)} />
        </FormField>
        <FormField label="Birthday" hint="Optional">
          <Input
            type="date"
            value={values.birthday}
            onChange={(e) => set('birthday', e.target.value)}
          />
        </FormField>
        <FormField label="Approximate age" hint="If birthday unknown">
          <Input
            value={values.approximateAge}
            onChange={(e) => set('approximateAge', e.target.value)}
          />
        </FormField>
        <FormField label="Size">
          <Select value={values.size} onChange={(e) => set('size', e.target.value as DogInput['size'])}>
            {sizes.map((size) => (
              <option key={size} value={size} className="capitalize">
                {size}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Sex">
          <Select value={values.sex} onChange={(e) => set('sex', e.target.value as DogInput['sex'])}>
            {sexes.map((sex) => (
              <option key={sex} value={sex} className="capitalize">
                {sex}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Vet name">
          <Input value={values.vetName} onChange={(e) => set('vetName', e.target.value)} />
        </FormField>
        <FormField label="Vet phone">
          <Input value={values.vetPhone} onChange={(e) => set('vetPhone', e.target.value)} />
        </FormField>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <Checkbox
            checked={values.spayedNeutered}
            onCheckedChange={(checked) => set('spayedNeutered', checked)}
          />
          Spayed / neutered
        </label>
        <FormField label="Feeding instructions" className="sm:col-span-2">
          <Textarea
            value={values.feedingInstructions}
            onChange={(e) => set('feedingInstructions', e.target.value)}
          />
        </FormField>
        <FormField label="Medication" className="sm:col-span-2">
          <Textarea
            value={values.medicationInstructions}
            onChange={(e) => set('medicationInstructions', e.target.value)}
          />
        </FormField>
        <FormField label="Behaviour notes">
          <Textarea
            value={values.behaviourNotes}
            onChange={(e) => set('behaviourNotes', e.target.value)}
          />
        </FormField>
        <FormField label="Compatibility">
          <Textarea
            value={values.compatibilityNotes}
            onChange={(e) => set('compatibilityNotes', e.target.value)}
          />
        </FormField>
        <FormField label="Care notes" className="sm:col-span-2">
          <Textarea
            value={values.careNotes}
            onChange={(e) => set('careNotes', e.target.value)}
          />
        </FormField>
        <FormField label="Vaccination notes" className="sm:col-span-2">
          <Textarea
            value={values.vaccinationNotes}
            onChange={(e) => set('vaccinationNotes', e.target.value)}
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
