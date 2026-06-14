export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface ToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content?: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export interface PendingAction {
  id: string
  name: string
  args: Record<string, JsonValue>
  label: string
  description: string
  destructive: boolean
}

export type AgentTurnResult =
  | { status: 'final'; newMessages: ChatMessage[]; text: string }
  | {
      status: 'awaiting_confirmation'
      newMessages: ChatMessage[]
      pendingActions: PendingAction[]
    }
