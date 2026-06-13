import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

let cached: ReturnType<typeof drizzle<typeof schema>> | null = null
let sqlClient: ReturnType<typeof postgres> | null = null

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL)
}

export function getDb() {
  if (!process.env.DATABASE_URL) return null
  if (!cached) {
    sqlClient = postgres(process.env.DATABASE_URL, { prepare: false })
    cached = drizzle(sqlClient, { schema })
  }
  return cached
}
