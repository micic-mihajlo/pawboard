import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LogOut } from 'lucide-react'
import { Button } from '../ui/button'
import { signOut } from '../../features/auth/functions'

export function SignOutButton() {
  const router = useRouter()
  const logout = useServerFn(signOut)
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await logout()
        await router.invalidate()
      }}
    >
      <LogOut size={16} />
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  )
}
