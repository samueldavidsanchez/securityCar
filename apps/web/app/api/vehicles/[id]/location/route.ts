import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadOwnedVehicle } from '@/lib/api/vehicle'
import { getLatestMessage } from '@/lib/flespi/client'
import { toPosition } from '@/lib/flespi/transforms'

const LOCATION_FIELDS = [
  'timestamp',
  'position.latitude',
  'position.longitude',
  'position.altitude',
  'position.direction',
]

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/location'>
) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadOwnedVehicle(supabase, user, id)
    const raw = await getLatestMessage(vehicle.flespi_device_id, LOCATION_FIELDS)
    const position = raw ? toPosition(raw) : null
    if (!position) return fail('Sin datos de ubicación', 404)
    return ok(position)
  } catch (err) {
    return handleError(err)
  }
}
