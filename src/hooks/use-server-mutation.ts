import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useToast } from '../components/ui/toast'

type ServerFn<TInput, TResult> = (opts: {
  data: TInput
}) => Promise<TResult>

interface Options<TResult> {
  successMessage?: string
  onSuccess?: (result: TResult) => void | Promise<void>
}

/**
 * Wraps a TanStack server function: tracks pending/error state, invalidates the
 * router cache on success, and surfaces toasts. Returns `mutate(input)`.
 */
export function useServerMutation<TInput, TResult>(
  fn: ServerFn<TInput, TResult>,
  options: Options<TResult> = {},
) {
  const router = useRouter()
  const call = useServerFn(fn)
  const { toast } = useToast()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (input: TInput) => {
    setPending(true)
    setError(null)
    try {
      const result = (await call({ data: input })) as TResult
      await router.invalidate()
      if (options.successMessage) toast({ title: options.successMessage })
      await options.onSuccess?.(result)
      return result
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Something went wrong.'
      setError(message)
      toast({ title: 'Error', description: message, variant: 'destructive' })
      throw caught
    } finally {
      setPending(false)
    }
  }

  return { mutate, pending, error }
}
