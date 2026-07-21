import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { getTrips } from '@/lib/flespi/client'
import { toTrip } from '@/lib/flespi/transforms'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/trips'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadAccessibleVehicle(supabase, id, 'viewer')

    // Default window: last 7 days.
    const to = Math.floor(Date.now() / 1000)
    const from = to - 7 * 24 * 60 * 60
    const raw = await getTrips(vehicle.device.flespi_device_id, from, to)
    const trips = raw.map(toTrip).filter(t => t.started_at && t.ended_at)
    return ok(trips)
  } catch (err) {
    return handleError(err)
  }
}
