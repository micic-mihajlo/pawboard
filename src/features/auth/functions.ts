import { createServerFn } from '@tanstack/react-start'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'
import { z } from 'zod'

const COOKIE_NAME = 'pawboard_session'

function expectedAccessCode() {
  return process.env.OPERATOR_ACCESS_CODE || 'demo'
}

function isAuthed() {
  return getCookie(COOKIE_NAME) === expectedAccessCode()
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

    setCookie(COOKIE_NAME, data.accessCode, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    })

    return { authenticated: true, error: '' }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(() => {
  deleteCookie(COOKIE_NAME, { path: '/' })
  return { authenticated: false }
})
