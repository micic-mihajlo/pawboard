import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { runAgentTurn, executeConfirmedAction } from './agent.server'
import { hasOpenRouterKey } from './openrouter.server'
import { requireOperator } from '../auth/guard.server'

const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({ name: z.string(), arguments: z.string() }),
})

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string().nullable().optional(),
  tool_calls: z.array(toolCallSchema).optional(),
  tool_call_id: z.string().optional(),
})

export const getAssistantConfig = createServerFn({ method: 'GET' }).handler(
  () => ({ configured: hasOpenRouterKey() }),
)

export const agentTurn = createServerFn({ method: 'POST' })
  .validator(z.object({ messages: z.array(messageSchema) }))
  .handler(({ data }) => {
    requireOperator()
    return runAgentTurn(data.messages)
  })

export const executeAction = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().min(1),
      args: z.record(z.string(), z.unknown()),
    }),
  )
  .handler(({ data }) => {
    requireOperator()
    return executeConfirmedAction(data.name, data.args)
  })
