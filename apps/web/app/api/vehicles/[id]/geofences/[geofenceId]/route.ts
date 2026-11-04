import type { NextRequest } from 'next/server'
import { UpdateGeofenceSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { deleteGeofence } from '@/lib/flespi/client'
import { SupabaseGeofenceRepository } from '@/repositories/GeofenceRepository'

type Ctx = RouteContext<'/api/vehicles/[id]/geofences/[geofenceId]'>

/** Renombrar o cambiar qué alertas dispara. La geometría no se edita. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id, geofenceId } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = UpdateGeofenceSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    await loadAccessibleVehicle(supabase, id, 'driver')
    const repo = new SupabaseGeofenceRepository(supabase)
    const geofence = await repo.update(geofenceId, id, parsed.data)
    if (!geofence) return fail('Geocerca no encontrada', 404)
    return ok(geofence)
  } catch (err) {
    return handleError(err)
  }
}

/**
 * Borra en Flespi primero: si Flespi falla la fila sigue y el usuario puede
 * reintentar; al revés quedaría una geocerca en Flespi sin forma de borrarla
 * desde la app. Un 404 de Flespi (ya borrada) no bloquea.
 */
export async function DELETE(request: NextRequest, ctx: Ctx) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id, geofenceId } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'driver')
    const repo = new SupabaseGeofenceRepository(supabase)

    const flespiId = await repo.findFlespiId(geofenceId, id)
    if (flespiId !== null) {
      await deleteGeofence(flespiId).catch(err => {
        if ((err as { status?: number }).status !== 404) throw err
      })
    }
    await repo.remove(geofenceId, id)
    return ok({ id: geofenceId })
  } catch (err) {
    return handleError(err)
  }
}
