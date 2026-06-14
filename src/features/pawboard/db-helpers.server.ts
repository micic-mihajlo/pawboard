import { getDb } from '../../db/client.server'
import * as schema from '../../db/schema'

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'DATABASE_URL is not configured. Run `npm run db:up` then `npm run db:migrate && npm run db:seed`.',
    )
    this.name = 'DatabaseNotConfiguredError'
  }
}

export type Database = NonNullable<ReturnType<typeof getDb>>

/** Returns the Drizzle client or throws a clear setup error. */
export function requireDb(): Database {
  const db = getDb()
  if (!db) throw new DatabaseNotConfiguredError()
  return db
}

export interface AuditEntry {
  action: string
  entityType: string
  entityId: string
  summary: string
  actor?: string
}

/** Records an audit-log entry. Works with the db client or a transaction. */
export async function writeAudit(
  executor: Pick<Database, 'insert'>,
  entry: AuditEntry,
) {
  await executor.insert(schema.auditLogs).values({
    actor: entry.actor ?? 'operator',
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    summary: entry.summary,
  })
}

/** Standard `updated_at` patch for mutations. */
export function touch() {
  return { updatedAt: new Date() }
}
