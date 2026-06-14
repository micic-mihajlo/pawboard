import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  className?: string
}

function Checkbox({
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'border-input flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50',
        checked && 'bg-primary border-primary text-primary-foreground',
        className,
      )}
    >
      {checked ? <Check size={11} strokeWidth={3} /> : null}
    </button>
  )
}

export { Checkbox }
