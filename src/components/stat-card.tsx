import type { LucideIcon } from 'lucide-react'
import { Card } from './ui/card'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
}

export function StatCard({ label, value, hint, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm font-medium">{label}</p>
        <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight tabular">
        {value}
      </div>
      {hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </Card>
  )
}
