import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getPawboardSnapshot, updateBookingStatus } from './repository.server'

export const getSnapshot = createServerFn({ method: 'GET' }).handler(() =>
  getPawboardSnapshot(),
)

export const setBookingStatus = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id: z.string().min(1),
      status: z.enum([
        'inquiry',
        'confirmed',
        'checked_in',
        'checked_out',
        'cancelled',
      ]),
    }),
  )
  .handler(({ data }) => updateBookingStatus(data.id, data.status))
