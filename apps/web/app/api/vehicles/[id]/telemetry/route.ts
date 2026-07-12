import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadOwnedVehicle } from '@/lib/api/vehicle'
import { getLatestMessage } from '@/lib/flespi/client'
import { TELEMETRY_FIELDS, toTelemetry } from '@/lib/flespi/transforms'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/telemetry'>
) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadOwnedVehicle(supabase, user, id)
    const raw = await getLatestMessage(vehicle.flespi_device_id, TELEMETRY_FIELDS)
    return ok(toTelemetry(raw))
  } catch (err) {
    return handleError(err)
  }
}
