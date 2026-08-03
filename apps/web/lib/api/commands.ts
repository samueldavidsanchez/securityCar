import type { SupabaseClient } from '@supabase/supabase-js'
import type { SendCommandInput, Vehicle } from '@securitycar/shared'
import { sendCommand } from '@/lib/flespi/client'
import { toFlespiCommand } from '@/lib/flespi/transforms'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'

const COMMAND_RATE_LIMIT_PER_MINUTE = 10

export type DispatchCommandResult =
  | { ok: true; logId: string }
  | { ok: false; error: string; status: number }

/**
 * Secuencia compartida de envío de comandos: rate limit → registrar intento →
 * despachar a Flespi → marcar resultado. La usan tanto la ruta de consumidor
 * (`/api/vehicles/[id]/commands`) como la de admin
 * (`/api/admin/vehicles/[id]/commands`) — la autorización (rol o
 * `requireAdmin`) ya se resolvió antes de llegar aquí, esta función no la
 * vuelve a comprobar. El llamador traduce el resultado a `ok(...)`/`fail(...)`.
 *
 * El rate limit se cuenta por `userId` sin distinguir origen: un admin que
 * envía comandos comparte el mismo límite de 10/min que cualquier usuario, a
 * propósito, sin caso especial.
 */
export async function dispatchCommand(
  supabase: SupabaseClient,
  userId: string,
  vehicle: Vehicle,
  parsed: SendCommandInput
): Promise<DispatchCommandResult> {
  const repo = new SupabaseCommandRepository(supabase)

  const since = new Date(Date.now() - 60_000).toISOString()
  if ((await repo.countRecentByUser(userId, since)) >= COMMAND_RATE_LIMIT_PER_MINUTE) {
    return { ok: false, error: 'Demasiados comandos en poco tiempo. Espera un momento.', status: 429 }
  }

  // Audit trail: record intent before dispatching.
  const log = await repo.logPending({
    vehicle_id: vehicle.id,
    user_id: userId,
    command_type: parsed.type,
    payload: parsed.payload ?? null,
  })

  try {
    const flespiCmd = toFlespiCommand(parsed.type, parsed.payload)
    const response = await sendCommand(vehicle.device.flespi_device_id, flespiCmd)
    // Id que Flespi asigna al comando encolado: permite al webhook casar el
    // ACK del dispositivo y pasar el log a 'confirmed'.
    const flespiCommandId = typeof response.id === 'number' ? response.id : null
    await repo.markResult(log.id, 'sent', response, flespiCommandId)
    return { ok: true, logId: log.id }
  } catch (dispatchErr) {
    await repo.markResult(log.id, 'failed', {
      error: dispatchErr instanceof Error ? dispatchErr.message : 'unknown',
    })
    throw dispatchErr
  }
}
