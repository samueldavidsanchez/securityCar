import type { NextRequest } from 'next/server'
import { UpdateMemberRoleSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/** Cambia el rol de un usuario con acceso. Solo el propietario. */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/users/[userId]'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id, userId } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = UpdateMemberRoleSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Rol inválido', 422)
    }

    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseSharingRepository(supabase)
    await repo.updateMemberRole(id, userId, parsed.data.role)
    return ok({ updated: true })
  } catch (err) {
    return handleError(err)
  }
}

/** Revoca el acceso de un usuario. Solo el propietario. */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/users/[userId]'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id, userId } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseSharingRepository(supabase)
    await repo.revokeMember(id, userId)
    return ok({ revoked: true })
  } catch (err) {
    return handleError(err)
  }
}
