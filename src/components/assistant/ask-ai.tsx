import { useEffect, useRef, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useRouter } from '@tanstack/react-router'
import { Bot, Check, Loader2, Send, Sparkles, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { cn } from '../../lib/utils'
import {
  agentTurn,
  executeAction,
  getAssistantConfig,
} from '../../features/assistant/functions'
import type {
  ChatMessage,
  PendingAction,
} from '../../features/assistant/types'

const SUGGESTIONS = [
  'Who is checking out today?',
  'What is our revenue this month?',
  'Which invoices are unpaid?',
]

export function AskAI() {
  const router = useRouter()
  const callAgent = useServerFn(agentTurn)
  const callExecute = useServerFn(executeAction)
  const callConfig = useServerFn(getAssistantConfig)

  const [open, setOpen] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction[] | null>(null)
  const [resolvedIds, setResolvedIds] = useState<string[]>([])
  const resolutions = useRef<Record<string, string>>({})
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && configured === null) {
      callConfig().then((c) => setConfigured(c.configured)).catch(() => {})
    }
  }, [open, configured, callConfig])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, pending, busy])

  const runTurn = async (conversation: ChatMessage[]) => {
    setBusy(true)
    setError(null)
    try {
      const result = await callAgent({ data: { messages: conversation } })
      const full = [...conversation, ...result.newMessages]
      setMessages(full)
      if (result.status === 'awaiting_confirmation') {
        setPending(result.pendingActions)
      } else {
        setPending(null)
        // Reads from confirmed writes may have changed data — refresh the app.
        await router.invalidate()
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    void runTurn(next)
  }

  const continueIfResolved = (current: ChatMessage[]) => {
    if (!pending) return
    if (Object.keys(resolutions.current).length < pending.length) return
    const toolMessages: ChatMessage[] = pending.map((action) => ({
      role: 'tool',
      tool_call_id: action.id,
      content: resolutions.current[action.id],
    }))
    const convo = [...current, ...toolMessages]
    resolutions.current = {}
    setResolvedIds([])
    setPending(null)
    setMessages(convo)
    void runTurn(convo)
  }

  const approve = async (action: PendingAction) => {
    setBusy(true)
    try {
      resolutions.current[action.id] = await callExecute({
        data: { name: action.name, args: action.args },
      })
    } catch (caught) {
      resolutions.current[action.id] = JSON.stringify({
        ok: false,
        error: caught instanceof Error ? caught.message : 'Action failed',
      })
    }
    setResolvedIds((ids) => [...ids, action.id])
    setBusy(false)
    continueIfResolved(messages)
  }

  const reject = (action: PendingAction) => {
    resolutions.current[action.id] = JSON.stringify({
      ok: false,
      declined: true,
      message: 'Operator declined this action.',
    })
    setResolvedIds((ids) => [...ids, action.id])
    continueIfResolved(messages)
  }

  const visible = messages.filter(
    (m) =>
      m.role === 'user' ||
      (m.role === 'assistant' && (m.content?.trim().length ?? 0) > 0),
  )

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-brand text-brand-foreground no-print fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium shadow-lg transition-transform hover:scale-105"
        >
          <Sparkles size={16} /> Ask AI
        </button>
      ) : null}

      {open ? (
        <div className="no-print fixed bottom-5 right-5 z-50 flex h-[600px] max-h-[calc(100vh-2.5rem)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border bg-card shadow-2xl">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <div className="bg-brand text-brand-foreground flex size-7 items-center justify-center rounded-md">
              <Bot size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-none">Ask AI</div>
              <div className="text-muted-foreground mt-0.5 truncate text-xs">
                Your PawBoard assistant
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X size={15} />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {configured === false ? (
              <div className="bg-warning/10 text-foreground rounded-lg border p-3 text-xs">
                <p className="font-medium">OpenRouter not configured</p>
                <p className="text-muted-foreground mt-1">
                  Set <span className="font-mono">OPENROUTER_API_KEY</span> in
                  your environment (and Vercel) to enable Ask AI.
                </p>
              </div>
            ) : null}

            {visible.length === 0 && configured !== false ? (
              <div className="space-y-3 py-4">
                <p className="text-muted-foreground text-center text-sm">
                  Ask about your bookings, owners, invoices — or have me draft an
                  action for your approval.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="hover:bg-accent rounded-md border px-3 py-2 text-left text-sm transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="bg-brand/5 text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                  <span className="text-foreground font-medium">Tip:</span> paste
                  a customer&rsquo;s text message and I&rsquo;ll draft the booking
                  for you to approve.
                </div>
              </div>
            ) : null}

            {visible.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  m.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {pending
              ? pending.map((action) => {
                  const done = resolvedIds.includes(action.id)
                  return (
                    <div
                      key={action.id}
                      className="bg-card rounded-lg border p-3 shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'inline-flex size-5 items-center justify-center rounded-full text-xs',
                            action.destructive
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-brand/10 text-brand',
                          )}
                        >
                          {done ? <Check size={12} /> : '!'}
                        </span>
                        <span className="text-sm font-medium">
                          {action.label}
                        </span>
                      </div>
                      {action.description ? (
                        <p className="text-muted-foreground mt-1 pl-7 text-xs">
                          {action.description}
                        </p>
                      ) : null}
                      {!done ? (
                        <div className="mt-2.5 flex gap-2 pl-7">
                          <Button
                            size="sm"
                            variant={action.destructive ? 'destructive' : 'default'}
                            onClick={() => approve(action)}
                            disabled={busy}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => reject(action)}
                            disabled={busy}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground mt-1 pl-7 text-xs">
                          Resolved
                        </p>
                      )}
                    </div>
                  )
                })
              : null}

            {busy ? (
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 size={14} className="animate-spin" /> Thinking…
              </div>
            ) : null}

            {error ? (
              <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-xs">
                {error}
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-end gap-2 border-t p-3"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="Ask anything, or paste a message…"
              disabled={busy || configured === false}
              className="max-h-32 min-h-10 resize-none"
            />
            <Button
              type="submit"
              size="icon"
              className="shrink-0"
              disabled={busy || !input.trim() || configured === false}
              aria-label="Send"
            >
              <Send size={15} />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  )
}
