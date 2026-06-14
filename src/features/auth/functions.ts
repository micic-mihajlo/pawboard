import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { z } from 'zod'
import { SESSION_COOKIE, expectedAccessCode } from './session'

function isAuthed() {
  return getCookie(SESSION_COOKIE) === expectedAccessCode()
}

export const getAuthState = createServerFn({ method: 'GET' }).handler(() => ({
  authenticated: isAuthed(),
  demoMode: !process.env.OPERATOR_ACCESS_CODE,
}))

export const signIn = createServerFn({ method: 'POST' })
  .validator(z.object({ accessCode: z.string().min(1) }))
  .handler(({ data }) => {
    if (data.accessCode !== expectedAccessCode()) {
      return { authenticated: false, error: 'Access code did not match.' }
    }

    setCookie(SESSION_COOKIE, data.accessCode, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    })

    return { authenticated: true, error: '' }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(() => {
  deleteCookie(SESSION_COOKIE, { path: '/' })
  return { authenticated: false }
})
