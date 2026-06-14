import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LockKeyhole, PawPrint } from 'lucide-react'
import { getAuthState, signIn } from '../features/auth/functions'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const auth = await getAuthState()
    if (auth.authenticated) throw redirect({ to: '/' })
    return { demoMode: auth.demoMode }
  },
  loader: ({ context }) => ({ demoMode: context.demoMode }),
  component: LoginScreen,
})

function LoginScreen() {
  const { demoMode } = Route.useLoaderData()
  const router = useRouter()
  const login = useServerFn(signIn)
  const [accessCode, setAccessCode] = useState(demoMode ? 'demo' : '')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const result = await login({ data: { accessCode } })
      if (!result.authenticated) {
        setError(result.error)
        return
      }
      await router.invalidate()
      await router.navigate({ to: '/' })
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="bg-brand text-brand-foreground flex size-12 items-center justify-center rounded-xl">
            <PawPrint size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">PawBoard</h1>
            <p className="text-muted-foreground text-sm">
              Private boarding operations console
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="bg-card animate-fade-up space-y-4 rounded-xl border p-6 shadow-sm"
        >
          <div className="space-y-1.5">
            <Label htmlFor="access-code">Access code</Label>
            <div className="relative">
              <LockKeyhole className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                id="access-code"
                type="password"
                autoFocus
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="pl-9"
                placeholder="Enter access code"
              />
            </div>
            {demoMode ? (
              <p className="text-muted-foreground text-xs">
                Local mode — the default code is{' '}
                <span className="font-mono">demo</span>.
              </p>
            ) : null}
          </div>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <Button className="w-full" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </main>
  )
}
