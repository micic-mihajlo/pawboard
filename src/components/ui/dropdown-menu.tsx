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
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(
    null,
  )
  const triggerRef = React.useRef<HTMLDivElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Position the menu after it mounts, flipping above the trigger and clamping
  // to the viewport so it never opens off-screen on low rows.
  React.useLayoutEffect(() => {
    if (!open) return
    const t = triggerRef.current?.getBoundingClientRect()
    const m = menuRef.current?.getBoundingClientRect()
    if (!t) return
    const margin = 8
    const menuW = m?.width ?? 176
    const menuH = m?.height ?? 0
    const spaceBelow = window.innerHeight - t.bottom
    const top =
      spaceBelow < menuH + margin && t.top > spaceBelow
        ? Math.max(margin, t.top - menuH - 6)
        : Math.min(t.bottom + 6, window.innerHeight - menuH - margin)
    const rawLeft = align === 'end' ? t.right - menuW : t.left
    const left = Math.max(
      margin,
      Math.min(rawLeft, window.innerWidth - menuW - margin),
    )
    setCoords({ top, left })
  }, [open, align])

  React.useEffect(() => {
    if (!open) return
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
  }, [open])

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex"
        onClick={() => {
          setCoords(null)
          setOpen((value) => !value)
        }}
      >
        {trigger}
      </div>
      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                top: coords?.top ?? 0,
                left: coords?.left ?? 0,
                visibility: coords ? 'visible' : 'hidden',
              }}
              className="bg-popover text-popover-foreground animate-fade-up z-50 max-h-[70vh] min-w-44 overflow-y-auto rounded-lg border p-1 shadow-lg"
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
