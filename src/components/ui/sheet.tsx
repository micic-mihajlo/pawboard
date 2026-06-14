import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="animate-overlay-in absolute inset-0 bg-black/45"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        className={cn(
          'bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 w-72 border-r shadow-xl',
          'duration-300 ease-out',
          className,
        )}
        style={{ animation: 'pb-fade-up 0.2s ease-out' }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
