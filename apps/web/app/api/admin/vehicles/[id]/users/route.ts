import type { NextRequest } from 'next/server'
import { AdminGrantMemberSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/**
 * Otorga acceso directo a un usuario sobre un vehículo, sin invitación —
 * exclusivo del panel admin (el flujo normal de un propietario sigue siendo
 * `POST /api/vehicles/[id]/invitations` + aceptación por el invitado).
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/vehicles/[id]/users'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = AdminGrantMemberSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const repo = new SupabaseSharingRepository(supabase)
    await repo.grantMember(id, parsed.data.user_id, parsed.data.role)
    return ok({ granted: true }, 201)
  } catch (err) {
    return handleError(err)
  }
}
