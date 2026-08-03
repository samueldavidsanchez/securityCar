import type { NextRequest } from 'next/server'
import { SendCommandSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { dispatchCommand } from '@/lib/api/commands'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'

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

    const result = await dispatchCommand(supabase, user.id, vehicle, parsed.data)
    if (!result.ok) return fail(result.error, result.status)
    return ok({ logId: result.logId, status: 'sent' }, 202)
  } catch (err) {
    return handleError(err)
  }
}
