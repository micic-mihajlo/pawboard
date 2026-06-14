import {
  CalendarDays,
  ClipboardList,
  Download,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/owners', label: 'Owners & Dogs', icon: Users },
  { to: '/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/exports', label: 'Exports', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
]
