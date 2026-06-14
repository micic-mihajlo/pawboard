import { eq } from 'drizzle-orm'
import * as schema from '../../../db/schema'
import { requireDb, touch, writeAudit } from '../db-helpers.server'
import type { OwnerInput } from '../schemas'

export async function createOwner(input: OwnerInput) {
  const db = requireDb()
  const [owner] = await db.insert(schema.owners).values(input).returning()
  await writeAudit(db, {
    action: 'created',
    entityType: 'owner',
    entityId: owner.id,
    summary: `Created owner ${owner.firstName} ${owner.lastName}.`,
  })
  return { id: owner.id }
}

export async function updateOwner(id: string, input: OwnerInput) {
  const db = requireDb()
  await db
    .update(schema.owners)
    .set({ ...input, ...touch() })
    .where(eq(schema.owners.id, id))
  await writeAudit(db, {
    action: 'updated',
    entityType: 'owner',
    entityId: id,
    summary: `Updated owner ${input.firstName} ${input.lastName}.`,
  })
  return { id }
}

export async function setOwnerActive(id: string, active: boolean) {
  const db = requireDb()
  await db
    .update(schema.owners)
    .set({ active, ...touch() })
    .where(eq(schema.owners.id, id))
  await writeAudit(db, {
    action: active ? 'restored' : 'archived',
    entityType: 'owner',
    entityId: id,
    summary: `Owner ${active ? 'restored' : 'archived'}.`,
  })
  return { id }
}

export async function deleteOwner(id: string) {
  const db = requireDb()
  const dogs = await db
    .select({ id: schema.dogs.id })
    .from(schema.dogs)
    .where(eq(schema.dogs.ownerId, id))
  const bookings = await db
    .select({ id: schema.bookings.id })
    .from(schema.bookings)
    .where(eq(schema.bookings.ownerId, id))
  if (dogs.length || bookings.length) {
    throw new Error(
      'This owner still has dogs or bookings. Archive them instead of deleting.',
    )
  }
  await db.delete(schema.owners).where(eq(schema.owners.id, id))
  await writeAudit(db, {
    action: 'deleted',
    entityType: 'owner',
    entityId: id,
    summary: 'Deleted owner.',
  })
  return { id }
}
