import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/** Usuarios con acceso concedido al vehículo. Solo el propietario. */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/users'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseSharingRepository(supabase)
    return ok(await repo.listMembers(id))
  } catch (err) {
    return handleError(err)
  }
}
