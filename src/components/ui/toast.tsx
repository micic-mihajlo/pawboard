import * as React from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Toast {
  id: number
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastContextValue {
  toast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = React.createContext<ToastContextValue>({
  toast: () => {},
})

export function useToast() {
  return React.useContext(ToastContext)
}

let nextId = 1

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const toast = React.useCallback(
    (input: Omit<Toast, 'id'>) => {
      const id = nextId++
      setToasts((current) => [...current, { ...input, id }])
      setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted
        ? createPortal(
            <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
              {toasts.map((item) => (
                <div
                  key={item.id}
                  className="animate-fade-up bg-popover text-popover-foreground flex items-start gap-3 rounded-lg border p-3.5 shadow-lg"
                >
                  {item.variant === 'destructive' ? (
                    <CircleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
                  ) : (
                    <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{item.title}</div>
                    {item.description ? (
                      <div className="text-muted-foreground mt-0.5 text-sm break-words">
                        {item.description}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className={cn(
                      'text-muted-foreground hover:text-foreground -mr-1 -mt-1 rounded p-1',
                    )}
                    aria-label="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  )
}
