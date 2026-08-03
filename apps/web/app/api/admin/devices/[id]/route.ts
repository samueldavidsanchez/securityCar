import type { NextRequest } from 'next/server'
import { AdminUpdateDeviceSchema, formatClaimCode } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { fail, handleError, ok } from '@/lib/api/response'
import { generateClaimCode } from '@/lib/devices/claimCode'
import { SupabaseAdminRepository } from '@/repositories/AdminRepository'

/**
 * Actualiza un dispositivo: cambiar estado (p.ej. retirar), actualizar el
 * ICCID, o regenerar el código de activación. Regenerar se rechaza si el
 * equipo ya fue reclamado — el código de un dispositivo activo no tiene
 * sentido (nadie lo necesita) y reescribirlo sería confuso.
 */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/devices/[id]'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = AdminUpdateDeviceSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const repo = new SupabaseAdminRepository(supabase)

    if (parsed.data.regenerate_claim_code) {
      const current = await repo.getDevice(id)
      if (!current) return fail('Dispositivo no encontrado', 404)
      if (current.claimed_by) {
        return fail('No se puede regenerar el código de un dispositivo ya reclamado', 409)
      }
      const claimCode = generateClaimCode()
      const updated = await repo.updateDevice(id, {
        status: parsed.data.status,
        sim_iccid: parsed.data.sim_iccid,
        claim_code: claimCode,
      })
      return ok({ device: updated, claim_code: formatClaimCode(claimCode) })
    }

    const updated = await repo.updateDevice(id, {
      status: parsed.data.status,
      sim_iccid: parsed.data.sim_iccid,
    })
    return ok({ device: updated })
  } catch (err) {
    return handleError(err)
  }
}
