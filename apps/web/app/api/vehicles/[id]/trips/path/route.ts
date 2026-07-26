import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { getTripRoute } from '@/lib/flespi/client'
import { toRoute } from '@/lib/flespi/transforms'

// Cota de seguridad: un viaje no dura más de un día. Evita que se pida el
// recorrido de un rango enorme (miles de puntos, timeout).
const MAX_WINDOW_SECONDS = 24 * 60 * 60

export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/trips/path'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadAccessibleVehicle(supabase, id, 'viewer')

    const params = request.nextUrl.searchParams
    const from = Number(params.get('from'))
    const to = Number(params.get('to'))
    if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= from) {
      return fail('Parámetros from/to inválidos', 400)
    }
    if (to - from > MAX_WINDOW_SECONDS) {
      return fail('La ventana del viaje es demasiado grande', 400)
    }

    const raw = await getTripRoute(vehicle.device.flespi_device_id, from, to)
    return ok(toRoute(raw))
  } catch (err) {
    return handleError(err)
  }
}
