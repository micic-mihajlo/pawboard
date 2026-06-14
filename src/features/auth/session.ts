// Shared session constants — no server-only imports, safe to import anywhere.

export const SESSION_COOKIE = 'pawboard_session'

export function expectedAccessCode() {
  return process.env.OPERATOR_ACCESS_CODE || 'demo'
}
