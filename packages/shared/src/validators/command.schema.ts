import { z } from 'zod'

export const SendCommandSchema = z.object({
  type: z.enum(['engine_block', 'engine_unblock', 'request_location', 'reboot', 'custom']),
  payload: z.record(z.string(), z.unknown()).optional(),
})

export type SendCommandInput = z.infer<typeof SendCommandSchema>
