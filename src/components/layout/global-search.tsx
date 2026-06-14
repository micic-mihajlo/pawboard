import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  ClipboardList,
  FileText,
  PawPrint,
  Search,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Dialog } from '../ui/dialog'
import { Input } from '../ui/input'
import { formatShortDate } from '../../lib/format'
import { formatMoney } from '../../domain/pricing'
import { ownerName } from '../../features/pawboard/selectors'
import type { PawboardSnapshot } from '../../domain/pawboard'

interface Result {
  id: string
  icon: LucideIcon
  type: string
  title: string
  subtitle: string
  to: string
}

function buildResults(snapshot: PawboardSnapshot, query: string): Result[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const all: Result[] = [
    ...snapshot.owners.map((owner) => ({
      id: `owner-${owner.id}`,
      icon: Users,
      type: 'Owner',
      title: `${owner.firstName} ${owner.lastName}`,
      subtitle: [owner.phone, owner.email].filter(Boolean).join(' · '),
      to: '/owners',
    })),
    ...snapshot.dogs.map((dog) => ({
      id: `dog-${dog.id}`,
      icon: PawPrint,
      type: 'Dog',
      title: dog.name,
      subtitle: `${dog.breed || 'Dog'} · ${ownerName(snapshot, dog.ownerId)}`,
      to: '/owners',
    })),
    ...snapshot.bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      icon: ClipboardList,
      type: 'Booking',
      title: ownerName(snapshot, booking.ownerId),
      subtitle: `${booking.status.replace('_', ' ')} · ${formatShortDate(booking.startAt)}`,
      to: '/bookings',
    })),
    ...snapshot.invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      icon: FileText,
      type: 'Invoice',
      title: invoice.invoiceNumber,
      subtitle: `${invoice.snapshot.ownerName} · ${formatMoney(invoice.balanceCents)} due`,
      to: '/invoices',
    })),
  ]
  return all
    .filter((item) =>
      `${item.type} ${item.title} ${item.subtitle}`.toLowerCase().includes(q),
    )
    .slice(0, 12)
}

export function GlobalSearch({ snapshot }: { snapshot: PawboardSnapshot }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(
    () => buildResults(snapshot, query),
    [snapshot, query],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const id = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(id)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  const select = (result: Result) => {
    setOpen(false)
    navigate({ to: result.to })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground border-input bg-background hover:bg-accent/60 flex h-9 w-full items-center gap-2 rounded-md border px-3 text-sm transition-colors sm:w-64"
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Find owners, dogs, bookings, and invoices."
        className="max-w-xl"
      >
        <div className="space-y-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a name, dog, or invoice number…"
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive((value) => Math.min(value + 1, results.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((value) => Math.max(value - 1, 0))
              } else if (event.key === 'Enter' && results[active]) {
                select(results[active])
              }
            }}
          />
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {query && results.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                No matches for “{query}”.
              </p>
            ) : null}
            {results.map((result, index) => (
              <button
                key={result.id}
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => select(result)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  index === active ? 'bg-accent' : 'hover:bg-accent/60'
                }`}
              >
                <result.icon
                  size={16}
                  className="text-muted-foreground shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {result.title}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {result.subtitle}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs">
                  {result.type}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Dialog>
    </>
  )
}
