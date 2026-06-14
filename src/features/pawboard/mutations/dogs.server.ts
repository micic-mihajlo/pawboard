import { eq } from 'drizzle-orm'
import * as schema from '../../../db/schema'
import { requireDb, touch, writeAudit } from '../db-helpers.server'
import type { DogInput } from '../schemas'

export async function createDog(input: DogInput) {
  const db = requireDb()
  const [dog] = await db.insert(schema.dogs).values(input).returning()
  await writeAudit(db, {
    action: 'created',
    entityType: 'dog',
    entityId: dog.id,
    summary: `Added dog ${dog.name}.`,
  })
  return { id: dog.id }
}

export async function updateDog(id: string, input: DogInput) {
  const db = requireDb()
  await db
    .update(schema.dogs)
    .set({ ...input, ...touch() })
    .where(eq(schema.dogs.id, id))
  await writeAudit(db, {
    action: 'updated',
    entityType: 'dog',
    entityId: id,
    summary: `Updated dog ${input.name}.`,
  })
  return { id }
}

export async function setDogActive(id: string, active: boolean) {
  const db = requireDb()
  await db
    .update(schema.dogs)
    .set({ active, ...touch() })
    .where(eq(schema.dogs.id, id))
  await writeAudit(db, {
    action: active ? 'restored' : 'archived',
    entityType: 'dog',
    entityId: id,
    summary: `Dog ${active ? 'restored' : 'archived'}.`,
  })
  return { id }
}

export async function deleteDog(id: string) {
  const db = requireDb()
  const links = await db
    .select({ bookingId: schema.bookingDogs.bookingId })
    .from(schema.bookingDogs)
    .where(eq(schema.bookingDogs.dogId, id))
  if (links.length) {
    throw new Error(
      'This dog is attached to bookings. Archive it instead of deleting.',
    )
  }
  await db.delete(schema.dogs).where(eq(schema.dogs.id, id))
  await writeAudit(db, {
    action: 'deleted',
    entityType: 'dog',
    entityId: id,
    summary: 'Deleted dog.',
  })
  return { id }
}
