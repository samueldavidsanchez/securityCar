import type { SupabaseClient } from '@supabase/supabase-js'
import type { SendCommandInput, Vehicle } from '@securitycar/shared'
import { getDeviceProtocol, sendCommand } from '@/lib/flespi/client'
import { commandResponseText, toFlespiCommand } from '@/lib/flespi/transforms'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'

const COMMAND_RATE_LIMIT_PER_MINUTE = 10

export type DispatchCommandResult =
  | { ok: true; logId: string; response: string | null }
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
    const deviceId = vehicle.device.flespi_device_id
    const protocol = await getDeviceProtocol(deviceId)
    const flespiCmd = protocol ? toFlespiCommand(parsed.type, protocol, parsed.payload) : null
    if (!flespiCmd) {
      await repo.markResult(log.id, 'failed', { error: `Comando no soportado (${protocol ?? 'sin protocolo'})` })
      return { ok: false, error: 'Este equipo no admite ese comando.', status: 422 }
    }

    // Tiempo real: Flespi devuelve la respuesta del equipo en esta misma
    // llamada, así que el resultado es definitivo (confirmed / failed).
    const result = await sendCommand(deviceId, flespiCmd)
    const flespiCommandId = typeof result.id === 'number' ? result.id : null
    const responseText = commandResponseText(result.response)

    if (result.executed !== true) {
      await repo.markResult(log.id, 'failed', result, flespiCommandId)
      return {
        ok: false,
        error: 'El equipo no respondió. Puede estar sin señal o apagado; inténtalo de nuevo.',
        status: 504,
      }
    }

    await repo.markResult(log.id, 'confirmed', result, flespiCommandId)
    return { ok: true, logId: log.id, response: responseText }
  } catch (dispatchErr) {
    await repo.markResult(log.id, 'failed', {
      error: dispatchErr instanceof Error ? dispatchErr.message : 'unknown',
    })
    throw dispatchErr
  }
}
