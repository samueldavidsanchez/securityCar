import type { NextRequest } from 'next/server'
import { SendCommandSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { sendCommand } from '@/lib/flespi/client'
import { toFlespiCommand } from '@/lib/flespi/transforms'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'

const COMMAND_RATE_LIMIT_PER_MINUTE = 10

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/commands'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'viewer')
    const repo = new SupabaseCommandRepository(supabase)
    // Sin filtro por usuario: RLS decide qué ve cada quien. El propietario ve
    // todo el historial del vehículo; los demás, solo sus propios comandos.
    const logs = await repo.listByVehicle(id)
    return ok(logs)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/commands'>
) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = SendCommandSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Comando inválido', 422)
    }

    // 'driver' como mínimo: un usuario con acceso de solo lectura no puede
    // bloquear el motor. La política de command_logs lo exige también en la BD.
    const vehicle = await loadAccessibleVehicle(supabase, id, 'driver')
    const repo = new SupabaseCommandRepository(supabase)

    // Rate limit del envío. El despacho a Flespi solo ocurre aquí (el token es
    // server-only), así que contar en la ruta es suficiente: nadie puede
    // disparar comandos por otra vía. Frena el spam de bloqueos con una sesión
    // robada.
    const since = new Date(Date.now() - 60_000).toISOString()
    if ((await repo.countRecentByUser(user.id, since)) >= COMMAND_RATE_LIMIT_PER_MINUTE) {
      return fail('Demasiados comandos en poco tiempo. Espera un momento.', 429)
    }

    // Audit trail: record intent before dispatching.
    const log = await repo.logPending({
      vehicle_id: id,
      user_id: user.id,
      command_type: parsed.data.type,
      payload: parsed.data.payload ?? null,
    })

    try {
      const flespiCmd = toFlespiCommand(parsed.data.type, parsed.data.payload)
      const response = await sendCommand(vehicle.device.flespi_device_id, flespiCmd)
      // Id que Flespi asigna al comando encolado: permite al webhook casar el
      // ACK del dispositivo y pasar el log a 'confirmed'.
      const flespiCommandId = typeof response.id === 'number' ? response.id : null
      await repo.markResult(log.id, 'sent', response, flespiCommandId)
      return ok({ logId: log.id, status: 'sent' }, 202)
    } catch (dispatchErr) {
      await repo.markResult(log.id, 'failed', {
        error: dispatchErr instanceof Error ? dispatchErr.message : 'unknown',
      })
      throw dispatchErr
    }
  } catch (err) {
    return handleError(err)
  }
}
