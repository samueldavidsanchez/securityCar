import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/** Revoca una invitación pendiente. Solo el propietario. */
export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/invitations/[invitationId]'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id, invitationId } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseSharingRepository(supabase)
    await repo.revokeInvitation(id, invitationId)
    return ok({ revoked: true })
  } catch (err) {
    return handleError(err)
  }
}
