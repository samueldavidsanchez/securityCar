import type { NextRequest } from 'next/server'
import { SendCommandSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadOwnedVehicle } from '@/lib/api/vehicle'
import { sendCommand } from '@/lib/flespi/client'
import { toFlespiCommand } from '@/lib/flespi/transforms'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/commands'>
) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadOwnedVehicle(supabase, user, id)
    const repo = new SupabaseCommandRepository(supabase)
    const logs = await repo.listByVehicle(id, user.id)
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

    const vehicle = await loadOwnedVehicle(supabase, user, id)
    const repo = new SupabaseCommandRepository(supabase)

    // Audit trail: record intent before dispatching.
    const log = await repo.logPending({
      vehicle_id: id,
      user_id: user.id,
      command_type: parsed.data.type,
      payload: parsed.data.payload ?? null,
    })

    try {
      const flespiCmd = toFlespiCommand(parsed.data.type, parsed.data.payload)
      const response = await sendCommand(vehicle.flespi_device_id, flespiCmd)
      await repo.markResult(log.id, 'sent', response)
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
