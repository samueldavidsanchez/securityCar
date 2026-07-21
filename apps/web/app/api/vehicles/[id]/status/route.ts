import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { getLatestMessage } from '@/lib/flespi/client'
import { STATUS_FIELDS, toStatus } from '@/lib/flespi/transforms'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/status'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadAccessibleVehicle(supabase, id, 'viewer')
    const raw = await getLatestMessage(vehicle.device.flespi_device_id, STATUS_FIELDS)
    return ok(toStatus(raw))
  } catch (err) {
    return handleError(err)
  }
}
