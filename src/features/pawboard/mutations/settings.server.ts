import { eq } from 'drizzle-orm'
import * as schema from '../../../db/schema'
import { requireDb, touch, writeAudit } from '../db-helpers.server'
import type { ServiceTypeInput, SettingsInput } from '../schemas'

const SETTINGS_ID = 'settings_main'

export async function updateSettings(input: SettingsInput) {
  const db = requireDb()
  const { hstRatePercent, ...rest } = input
  const values = {
    ...rest,
    hstRateBps: Math.round(hstRatePercent * 100),
  }
  await db
    .insert(schema.businessSettings)
    .values({ id: SETTINGS_ID, ...values })
    .onConflictDoUpdate({
      target: schema.businessSettings.id,
      set: { ...values, ...touch() },
    })
  await writeAudit(db, {
    action: 'updated',
    entityType: 'settings',
    entityId: SETTINGS_ID,
    summary: 'Updated business settings.',
  })
  return { id: SETTINGS_ID }
}

export async function upsertServiceType(input: ServiceTypeInput) {
  const db = requireDb()
  const { id, ...values } = input

  if (id) {
    await db
      .update(schema.serviceTypes)
      .set({ ...values, ...touch() })
      .where(eq(schema.serviceTypes.id, id))
    await writeAudit(db, {
      action: 'updated',
      entityType: 'service_type',
      entityId: id,
      summary: `Updated service ${values.name}.`,
    })
    return { id }
  }

  const [service] = await db
    .insert(schema.serviceTypes)
    .values(values)
    .returning()
  await writeAudit(db, {
    action: 'created',
    entityType: 'service_type',
    entityId: service.id,
    summary: `Added service ${service.name}.`,
  })
  return { id: service.id }
}

export async function setServiceTypeActive(id: string, active: boolean) {
  const db = requireDb()
  await db
    .update(schema.serviceTypes)
    .set({ active, ...touch() })
    .where(eq(schema.serviceTypes.id, id))
  await writeAudit(db, {
    action: active ? 'restored' : 'archived',
    entityType: 'service_type',
    entityId: id,
    summary: `Service ${active ? 'restored' : 'archived'}.`,
  })
  return { id }
}
