import type { ChatMessage } from './types'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export function hasOpenRouterKey() {
  return Boolean(process.env.OPENROUTER_API_KEY)
}

interface OpenRouterTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

interface CompletionMessage {
  role: 'assistant'
  content: string | null
  tool_calls?: ChatMessage['tool_calls']
}

/** Calls OpenRouter's OpenAI-compatible chat completions endpoint. */
export async function callOpenRouter(
  model: string,
  messages: ChatMessage[],
  tools: OpenRouterTool[],
): Promise<CompletionMessage> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) {
    throw new Error(
      'OPENROUTER_API_KEY is not set. Add it to your environment to use Ask AI.',
    )
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'X-Title': 'PawBoard',
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 400)}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: CompletionMessage }>
    error?: { message?: string }
  }
  const message = data.choices?.[0]?.message
  if (!message) {
    throw new Error(data.error?.message ?? 'OpenRouter returned no message.')
  }
  return message
}
