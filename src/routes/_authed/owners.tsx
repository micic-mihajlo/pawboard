import { useState } from 'react'
import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { PageHeader } from '../../components/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
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
import { StatusPill } from '../../components/status-pill'
import { ConfirmDialog } from '../../components/confirm-dialog'
import { EmptyState } from '../../components/empty-state'
import { OwnerFormDialog } from '../../features/pawboard/components/owner-form-dialog'
import { DogFormDialog } from '../../features/pawboard/components/dog-form-dialog'
import { useServerMutation } from '../../hooks/use-server-mutation'
import {
  deleteDogFn,
  deleteOwnerFn,
  setDogActiveFn,
  setOwnerActiveFn,
} from '../../features/pawboard/functions'
import { ownerName } from '../../features/pawboard/selectors'
import type { Dog, Owner } from '../../domain/pawboard'

export const Route = createFileRoute('/_authed/owners')({
  component: OwnersPage,
})

const route = getRouteApi('/_authed')

interface ConfirmState {
  title: string
  description?: string
  confirmLabel?: string
  destructive?: boolean
  run: () => Promise<unknown>
}

function OwnersPage() {
  const { snapshot } = route.useLoaderData()
  const [ownerDialog, setOwnerDialog] = useState<{
    open: boolean
    owner?: Owner
  }>({ open: false })
  const [dogDialog, setDogDialog] = useState<{
    open: boolean
    dog?: Dog
    defaultOwnerId?: string
  }>({ open: false })
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)

  const ownerActive = useServerMutation(setOwnerActiveFn)
  const ownerDelete = useServerMutation(deleteOwnerFn, {
    successMessage: 'Owner deleted',
  })
  const dogActive = useServerMutation(setDogActiveFn)
  const dogDelete = useServerMutation(deleteDogFn, {
    successMessage: 'Dog deleted',
  })

  const runConfirm = async () => {
    if (!confirm) return
    setConfirmPending(true)
    try {
      await confirm.run()
      setConfirm(null)
    } catch {
      // toast already surfaced by the mutation hook
    } finally {
      setConfirmPending(false)
    }
  }

  return (
    <div className="animate-fade-up space-y-8">
      <PageHeader
        title="Owners & Dogs"
        description="Contact book with emergency details and care notes."
      >
        <Button variant="outline" onClick={() => setDogDialog({ open: true })}>
          <Plus size={16} /> Add dog
        </Button>
        <Button onClick={() => setOwnerDialog({ open: true })}>
          <UserPlus size={16} /> Add owner
        </Button>
      </PageHeader>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Owners</h2>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Owner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Dogs</TableHead>
                <TableHead>Emergency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.owners.map((owner) => {
                const ownerDogs = snapshot.dogs.filter(
                  (dog) => dog.ownerId === owner.id,
                )
                return (
                  <TableRow key={owner.id} className={owner.active ? '' : 'opacity-60'}>
                    <TableCell className="pl-4 font-medium">
                      {owner.firstName} {owner.lastName}
                    </TableCell>
                    <TableCell>
                      <div>{owner.phone || '—'}</div>
                      <div className="text-muted-foreground text-xs">
                        {owner.email || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ownerDogs.map((dog) => dog.name).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {owner.emergencyContactName
                        ? `${owner.emergencyContactName} · ${owner.emergencyContactPhone}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {owner.active ? (
                        <StatusPill tone="success" label="Active" />
                      ) : (
                        <StatusPill tone="neutral" label="Archived" />
                      )}
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
                          onSelect={() => setOwnerDialog({ open: true, owner })}
                        >
                          <Pencil size={14} /> Edit
                        </DropdownItem>
                        <DropdownItem
                          onSelect={() =>
                            setDogDialog({ open: true, defaultOwnerId: owner.id })
                          }
                        >
                          <Plus size={14} /> Add dog
                        </DropdownItem>
                        <DropdownItem
                          onSelect={() =>
                            ownerActive.mutate({
                              id: owner.id,
                              active: !owner.active,
                            })
                          }
                        >
                          {owner.active ? (
                            <>
                              <Archive size={14} /> Archive
                            </>
                          ) : (
                            <>
                              <ArchiveRestore size={14} /> Restore
                            </>
                          )}
                        </DropdownItem>
                        <DropdownSeparator />
                        <DropdownItem
                          variant="destructive"
                          onSelect={() =>
                            setConfirm({
                              title: `Delete ${owner.firstName} ${owner.lastName}?`,
                              description:
                                'This permanently removes the owner. Only possible when they have no dogs or bookings.',
                              confirmLabel: 'Delete owner',
                              destructive: true,
                              run: () => ownerDelete.mutate({ id: owner.id }),
                            })
                          }
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
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Dogs</h2>
        {snapshot.dogs.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {snapshot.dogs.map((dog) => (
              <Card
                key={dog.id}
                className={`p-5 ${dog.active ? '' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{dog.name}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {dog.breed || 'Dog'} · {ownerName(snapshot, dog.ownerId)}
                    </div>
                  </div>
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal size={16} />
                      </Button>
                    }
                  >
                    <DropdownItem onSelect={() => setDogDialog({ open: true, dog })}>
                      <Pencil size={14} /> Edit
                    </DropdownItem>
                    <DropdownItem
                      onSelect={() =>
                        dogActive.mutate({ id: dog.id, active: !dog.active })
                      }
                    >
                      {dog.active ? (
                        <>
                          <Archive size={14} /> Archive
                        </>
                      ) : (
                        <>
                          <ArchiveRestore size={14} /> Restore
                        </>
                      )}
                    </DropdownItem>
                    <DropdownSeparator />
                    <DropdownItem
                      variant="destructive"
                      onSelect={() =>
                        setConfirm({
                          title: `Delete ${dog.name}?`,
                          description:
                            'Only possible when the dog has no bookings.',
                          confirmLabel: 'Delete dog',
                          destructive: true,
                          run: () => dogDelete.mutate({ id: dog.id }),
                        })
                      }
                    >
                      <Trash2 size={14} /> Delete
                    </DropdownItem>
                  </DropdownMenu>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <StatusPill tone="info" label={dog.size} />
                  <StatusPill tone="neutral" label={dog.sex} />
                  {dog.spayedNeutered ? (
                    <StatusPill tone="neutral" label="Fixed" />
                  ) : null}
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <NoteRow label="Feeding" value={dog.feedingInstructions} />
                  <NoteRow label="Medication" value={dog.medicationInstructions} />
                  <NoteRow label="Care" value={dog.careNotes} />
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No dogs yet"
            description="Add an owner, then add their dogs."
          />
        )}
      </section>

      <OwnerFormDialog
        open={ownerDialog.open}
        owner={ownerDialog.owner}
        onOpenChange={(open) => setOwnerDialog((s) => ({ ...s, open }))}
      />
      <DogFormDialog
        open={dogDialog.open}
        dog={dogDialog.dog}
        defaultOwnerId={dogDialog.defaultOwnerId}
        owners={snapshot.owners}
        onOpenChange={(open) => setDogDialog((s) => ({ ...s, open }))}
      />
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.title ?? ''}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        pending={confirmPending}
        onConfirm={runConfirm}
      />
    </div>
  )
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  )
}
