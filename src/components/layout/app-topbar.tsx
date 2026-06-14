import { Menu } from 'lucide-react'
import { Button } from '../ui/button'
import { ThemeToggle } from '../theme-toggle'
import { GlobalSearch } from './global-search'
import { SignOutButton } from './sign-out-button'
import type { PawboardSnapshot } from '../../domain/pawboard'

interface AppTopbarProps {
  snapshot: PawboardSnapshot
  onOpenNav: () => void
}

export function AppTopbar({ snapshot, onOpenNav }: AppTopbarProps) {
  return (
    <header className="no-print bg-background/85 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </Button>
      <div className="flex-1 md:flex-none">
        <GlobalSearch snapshot={snapshot} />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <SignOutButton />
      </div>
    </header>
  )
}
