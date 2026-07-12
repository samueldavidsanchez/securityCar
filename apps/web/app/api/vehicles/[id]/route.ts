import type { NextRequest } from 'next/server'
import { UpdateVehicleSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]'>) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const repo = new SupabaseVehicleRepository(supabase)
    const vehicle = await repo.findById(id, user.id)
    if (!vehicle) return fail('Vehículo no encontrado', 404)
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
    const repo = new SupabaseVehicleRepository(supabase)
    await repo.remove(id, user.id)
    return ok({ deleted: true })
  } catch (err) {
    return handleError(err)
  }
}
