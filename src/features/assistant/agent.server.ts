import { callOpenRouter } from './openrouter.server'
import {
  describeAction,
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
  return [
    'You are the assistant for PawBoard, a private dog-boarding operations app.',
    `Today is ${new Date().toISOString()} (timezone America/Toronto).`,
    'You help the operator answer questions and take actions on their data.',
    'Always call get_snapshot first to read current data before answering about it or referencing ids.',
    'Use the real ids returned by get_snapshot — never invent ids.',
    'Money is in cents. Dates are ISO 8601. Boarding is priced per night, daycare per day.',
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
      const pendingActions = writeCalls.map((call) =>
        describeAction(
          call.id,
          call.function.name,
          safeParseArgs(call.function.arguments),
        ),
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
