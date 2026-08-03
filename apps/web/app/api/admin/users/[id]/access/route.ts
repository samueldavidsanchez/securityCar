import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { handleError, ok } from '@/lib/api/response'
import { SupabaseAdminRepository } from '@/repositories/AdminRepository'

/** Vehículos a los que un usuario tiene acceso (dueño o compartido). Solo lectura. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/admin/users/[id]/access'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params
    const repo = new SupabaseAdminRepository(supabase)
    return ok(await repo.getUserAccess(id))
  } catch (err) {
    return handleError(err)
  }
}
