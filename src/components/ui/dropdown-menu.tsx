import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/utils'

interface MenuContextValue {
  close: () => void
}
const MenuContext = React.createContext<MenuContextValue>({ close: () => {} })

interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'end'
}

export function DropdownMenu({
  trigger,
  children,
  align = 'end',
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false)
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const reposition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      setCoords({ top: rect.bottom + 6, left: rect.left, width: rect.width })
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    reposition()
    const onScroll = () => setOpen(false)
    const onResize = () => setOpen(false)
    const onClick = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, reposition])

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: coords.top,
                ...(align === 'end'
                  ? { left: coords.left + coords.width, transform: 'translateX(-100%)' }
                  : { left: coords.left }),
              }}
              className="bg-popover text-popover-foreground animate-fade-up z-50 min-w-44 overflow-hidden rounded-lg border p-1 shadow-lg"
            >
              <MenuContext.Provider value={{ close: () => setOpen(false) }}>
                {children}
              </MenuContext.Provider>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

interface DropdownItemProps {
  onSelect?: () => void
  children: React.ReactNode
  variant?: 'default' | 'destructive'
  disabled?: boolean
}

export function DropdownItem({
  onSelect,
  children,
  variant = 'default',
  disabled,
}: DropdownItemProps) {
  const { close } = React.useContext(MenuContext)
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect?.()
        close()
      }}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors disabled:opacity-50',
        variant === 'destructive'
          ? 'text-destructive hover:bg-destructive/10'
          : 'hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function DropdownSeparator() {
  return <div className="bg-border my-1 h-px" />
}
