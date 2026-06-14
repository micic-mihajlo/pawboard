import { getCookie } from '@tanstack/react-start/server'
import { SESSION_COOKIE, expectedAccessCode } from './session'

/**
 * Throws if the caller isn't a signed-in operator. Server-only — call inside
 * server function handlers to protect mutating or credit-spending endpoints.
 */
export function requireOperator() {
  if (getCookie(SESSION_COOKIE) !== expectedAccessCode()) {
    throw new Error('Not authorized. Sign in to use this action.')
  }
}
