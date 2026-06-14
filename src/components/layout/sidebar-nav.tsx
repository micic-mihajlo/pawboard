import { Link } from '@tanstack/react-router'
import { PawPrint } from 'lucide-react'
import { navItems } from './nav'

interface SidebarNavProps {
  onNavigate?: () => void
  businessName: string
}

export function SidebarNav({ onNavigate, businessName }: SidebarNavProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <div className="bg-brand text-brand-foreground flex size-8 items-center justify-center rounded-lg">
          <PawPrint size={17} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight">
            PawBoard
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {businessName}
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            activeOptions={{ exact: item.to === '/' }}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            activeProps={{
              className:
                'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent',
            }}
          >
            <item.icon size={16} className="shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="text-muted-foreground border-t px-5 py-3 text-xs">
        Operations console
      </div>
    </div>
  )
}
