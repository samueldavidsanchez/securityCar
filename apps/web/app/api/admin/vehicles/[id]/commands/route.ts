import type { NextRequest } from 'next/server'
import { SendCommandSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { loadVehicleForAdmin, requireAdmin } from '@/lib/api/admin'
import { dispatchCommand } from '@/lib/api/commands'
import { fail, handleError, ok } from '@/lib/api/response'

/**
 * Envía un comando (p.ej. bloqueo de motor) a un vehículo de cualquier
 * cliente. Reusa exactamente la misma secuencia de despacho que
 * `/api/vehicles/[id]/commands` — mismo rate limit compartido por usuario,
 * sin caso especial para admin.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/vehicles/[id]/commands'>
) {
  try {
    const { user, supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = SendCommandSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Comando inválido', 422)
    }

    const vehicle = await loadVehicleForAdmin(supabase, id)
    const result = await dispatchCommand(supabase, user.id, vehicle, parsed.data)
    if (!result.ok) return fail(result.error, result.status)
    return ok({ logId: result.logId, status: 'sent' }, 202)
  } catch (err) {
    return handleError(err)
  }
}
