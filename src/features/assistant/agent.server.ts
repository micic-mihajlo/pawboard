import { callOpenRouter } from './openrouter.server'
import {
  describePendingActions,
  executeReadTool,
  executeWriteTool,
  isWriteTool,
  openAiTools,
} from './tools.server'
import type { AgentTurnResult, ChatMessage, JsonValue } from './types'

const MAX_STEPS = 5

// The model is chosen here, not by the user. Override with OPENROUTER_MODEL if
// ever needed — no UI, no per-user configuration.
function model() {
  return process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash'
}

function systemPrompt() {
  const now = new Date()
  const todayLocal = now.toLocaleString('en-CA', {
    timeZone: 'America/Toronto',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return [
    'You are the assistant for PawBoard, a private dog-boarding operations app used by the owner.',
    `Today is ${todayLocal}. The business timezone is America/Toronto.`,
    'You help the operator answer questions and take actions on their data.',
    'Always call get_snapshot first to read current data before answering about it or referencing ids.',
    'Use the real ids returned by get_snapshot — never invent ids.',
    'Money is in cents. Dates are ISO 8601. Boarding is priced per night, daycare per day.',
    '',
    'SCHEDULING FROM A PASTED MESSAGE:',
    'The operator often pastes a customer text/message and wants you to book it. From the message:',
    '- Identify the dog(s) and owner by name and match them to existing records from get_snapshot (names may be informal or partial).',
    '- Choose the service: overnight boarding if it spans nights / a sleepover / multiple days; daycare if it is a single day.',
    '- Resolve relative dates against today (e.g. "this Friday", "next weekend", "the 20th", "drop off Mon pick up Thu").',
    '- Default times when unspecified: boarding drop-off 17:00 and pick-up 11:00; daycare 08:00 to 17:00. Treat times as America/Toronto local and express tool args in ISO 8601.',
    '- Payment: if the message mentions paying cash, set paymentMethod to cash (billed without HST); otherwise default to e-transfer (HST applies). Each dog may have its own boarding and/or daycare rate override — pricing already accounts for it.',
    '- If the owner or dog is not found, do not guess — offer to create them first (propose create_owner / create_dog), then the booking.',
    '- If the dog or the dates are genuinely unclear, ask one short clarifying question instead of guessing.',
    '- Briefly restate what you understood (who, dogs, service, dates) before/while proposing create_booking.',
    '',
    'Write actions (create/update/status/invoice/payment) require the operator to confirm before they run — propose them by calling the matching tool; do not claim an action is done until you receive its tool result.',
    'Be concise and practical. Prefer short answers and small, clear steps.',
  ].join('\n')
}

function safeParseArgs(raw: string): Record<string, JsonValue> {
  try {
    return JSON.parse(raw) as Record<string, JsonValue>
  } catch {
    return {}
  }
}

/**
 * Runs one assistant turn: auto-executes read tools, and pauses for operator
 * confirmation when the model proposes a write tool. Returns the new messages
 * to append to the conversation.
 */
export async function runAgentTurn(
  conversation: ChatMessage[],
): Promise<AgentTurnResult> {
  const working: ChatMessage[] = [...conversation]
  const newMessages: ChatMessage[] = []

  for (let step = 0; step < MAX_STEPS; step++) {
    const message = await callOpenRouter(
      model(),
      [{ role: 'system', content: systemPrompt() }, ...working],
      openAiTools(),
    )

    const assistant: ChatMessage = {
      role: 'assistant',
      content: message.content ?? '',
      tool_calls: message.tool_calls,
    }
    working.push(assistant)
    newMessages.push(assistant)

    const toolCalls = message.tool_calls ?? []
    if (toolCalls.length === 0) {
      return { status: 'final', newMessages, text: message.content ?? '' }
    }

    const writeCalls = toolCalls.filter((tc) => isWriteTool(tc.function.name))
    const readCalls = toolCalls.filter((tc) => !isWriteTool(tc.function.name))

    for (const call of readCalls) {
      let content: string
      try {
        content = JSON.stringify(await executeReadTool(call.function.name))
      } catch (error) {
        content = JSON.stringify({
          error: error instanceof Error ? error.message : 'Tool failed',
        })
      }
      const toolMessage: ChatMessage = {
        role: 'tool',
        tool_call_id: call.id,
        content,
      }
      working.push(toolMessage)
      newMessages.push(toolMessage)
    }

    if (writeCalls.length > 0) {
      const pendingActions = await describePendingActions(
        writeCalls.map((call) => ({
          id: call.id,
          name: call.function.name,
          args: safeParseArgs(call.function.arguments),
        })),
      )
      return { status: 'awaiting_confirmation', newMessages, pendingActions }
    }
  }

  return {
    status: 'final',
    newMessages,
    text: 'I stopped after several steps — could you narrow the request?',
  }
}

/** Executes a write action the operator has confirmed; returns tool content. */
export async function executeConfirmedAction(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const result = await executeWriteTool(name, args)
    return JSON.stringify({ ok: true, result })
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Action failed',
    })
  }
}
