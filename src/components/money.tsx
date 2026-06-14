import { formatMoney } from '../domain/pricing'
import { cn } from '../lib/utils'

export function Money({
  cents,
  className,
}: {
  cents: number
  className?: string
}) {
  return <span className={cn('tabular', className)}>{formatMoney(cents)}</span>
}
