import { cloneElement, isValidElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { Label } from './ui/label'

interface FormFieldProps {
  label: string
  htmlFor?: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const generatedId = useId()
  const element = isValidElement(children)
    ? (children as ReactElement<{ id?: string }>)
    : null
  const existingId = element?.props.id
  // Associate the label with the control: reuse an explicit id, otherwise
  // inject a generated one onto the single child so click-to-focus and
  // screen-reader mapping work without every call site passing htmlFor.
  const controlId = existingId ?? htmlFor ?? generatedId
  const control =
    element && !existingId ? cloneElement(element, { id: controlId }) : children

  return (
    <div className={className}>
      <Label htmlFor={controlId} className="mb-1.5 block">
        {label}
      </Label>
      {control}
      {error ? (
        <p className="text-destructive mt-1 text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground mt-1 text-xs">{hint}</p>
      ) : null}
    </div>
  )
}
