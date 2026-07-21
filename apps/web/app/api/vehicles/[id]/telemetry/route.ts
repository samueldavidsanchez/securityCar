import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { getLatestMessage } from '@/lib/flespi/client'
import { TELEMETRY_FIELDS, toTelemetry } from '@/lib/flespi/transforms'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/telemetry'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadAccessibleVehicle(supabase, id, 'viewer')
    const raw = await getLatestMessage(vehicle.device.flespi_device_id, TELEMETRY_FIELDS)
    return ok(toTelemetry(raw))
  } catch (err) {
    return handleError(err)
  }
}
