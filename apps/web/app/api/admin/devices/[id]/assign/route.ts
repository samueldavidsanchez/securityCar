import type { NextRequest } from 'next/server'
import { AdminAssignDeviceSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseAdminRepository } from '@/repositories/AdminRepository'

/**
 * Asignación directa de un dispositivo provisionado a un vehículo nuevo, a
 * nombre del usuario que elija el admin — vía adicional al autoservicio
 * normal (el cliente canjeando su propio claim_code desde `/settings`).
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/devices/[id]/assign'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = AdminAssignDeviceSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const repo = new SupabaseAdminRepository(supabase)
    const outcome = await repo.assignDevice(id, parsed.data)

    if (!outcome.ok) {
      switch (outcome.reason) {
        case 'USER_NOT_FOUND':
          return fail('El usuario indicado no existe', 404)
        case 'DEVICE_UNAVAILABLE':
          return fail('El dispositivo ya fue reclamado o no existe', 409)
        default:
          return fail('No autorizado', 403)
      }
    }

    return ok({ vehicle_id: outcome.vehicleId }, 201)
  } catch (err) {
    return handleError(err)
  }
}
