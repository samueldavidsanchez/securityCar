import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseEventRepository } from '@/repositories/EventRepository'

/** Eventos de negocio del vehículo (desconexión, ignición, geocerca…). */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/events'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'viewer')
    const repo = new SupabaseEventRepository(supabase)
    return ok(await repo.listByVehicle(id))
  } catch (err) {
    return handleError(err)
  }
}
