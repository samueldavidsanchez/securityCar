import type { NextRequest } from 'next/server'
import { UpdateVehicleSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadAccessibleVehicle(supabase, id, 'viewer')
    return ok(vehicle)
  } catch (err) {
    return handleError(err)
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]'>) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = UpdateVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseVehicleRepository(supabase)
    const vehicle = await repo.update(id, user.id, parsed.data)
    if (!vehicle) return fail('Vehículo no encontrado', 404)
    return ok(vehicle)
  } catch (err) {
    return handleError(err)
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]'>) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    // Comprobación explícita: `remove` filtra por owner_id, así que sin esto un
    // usuario con acceso compartido recibiría {deleted:true} sin haber borrado
    // nada. Ahora obtiene 403.
    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseVehicleRepository(supabase)
    await repo.remove(id, user.id)
    return ok({ deleted: true })
  } catch (err) {
    return handleError(err)
  }
}
