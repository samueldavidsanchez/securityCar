import crypto from 'node:crypto'
import type { NextRequest } from 'next/server'
import { CreateGeofenceSchema, MAX_GEOFENCES_PER_VEHICLE } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { attachGeofenceToDevice, createGeofence, deleteGeofence } from '@/lib/flespi/client'
import { SupabaseGeofenceRepository } from '@/repositories/GeofenceRepository'

/** Geocercas del vehículo. Visibles para cualquier rol. */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/geofences'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'viewer')
    const repo = new SupabaseGeofenceRepository(supabase)
    return ok(await repo.listByVehicle(id))
  } catch (err) {
    return handleError(err)
  }
}

/**
 * Crea una geocerca. Orden: Flespi primero (es quien detecta), luego la fila.
 * Si la fila falla se borra el espejo en Flespi para no dejar geocercas
 * huérfanas generando eventos que nadie puede resolver.
 */
export async function POST(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/geofences'>) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = CreateGeofenceSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const vehicle = await loadAccessibleVehicle(supabase, id, 'driver')
    const repo = new SupabaseGeofenceRepository(supabase)
    if ((await repo.countByVehicle(id)) >= MAX_GEOFENCES_PER_VEHICLE) {
      return fail(`Máximo ${MAX_GEOFENCES_PER_VEHICLE} geocercas por vehículo`, 422)
    }

    const geofenceId = crypto.randomUUID()
    const flespiId = await createGeofence(geofenceId, parsed.data)
    try {
      await attachGeofenceToDevice(flespiId, vehicle.device.flespi_device_id)
      const geofence = await repo.create(geofenceId, id, user.id, parsed.data, flespiId)
      return ok(geofence, 201)
    } catch (err) {
      await deleteGeofence(flespiId).catch(e => console.error('[geofences] rollback Flespi', e))
      throw err
    }
  } catch (err) {
    return handleError(err)
  }
}
