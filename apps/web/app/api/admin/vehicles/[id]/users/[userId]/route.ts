import type { NextRequest } from 'next/server'
import { UpdateMemberRoleSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/** Cambia el rol de un usuario con acceso a un vehículo de cualquier cliente. */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/vehicles/[id]/users/[userId]'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id, userId } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = UpdateMemberRoleSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Rol inválido', 422)
    }

    const repo = new SupabaseSharingRepository(supabase)
    await repo.updateMemberRole(id, userId, parsed.data.role)
    return ok({ updated: true })
  } catch (err) {
    return handleError(err)
  }
}

/** Revoca el acceso de un usuario a un vehículo de cualquier cliente. */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/vehicles/[id]/users/[userId]'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id, userId } = await ctx.params
    const repo = new SupabaseSharingRepository(supabase)
    await repo.revokeMember(id, userId)
    return ok({ revoked: true })
  } catch (err) {
    return handleError(err)
  }
}
