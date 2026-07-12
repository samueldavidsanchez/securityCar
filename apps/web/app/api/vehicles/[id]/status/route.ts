import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { handleError, ok } from '@/lib/api/response'
import { loadOwnedVehicle } from '@/lib/api/vehicle'
import { getLatestMessage } from '@/lib/flespi/client'
import { STATUS_FIELDS, toStatus } from '@/lib/flespi/transforms'

export async function GET(request: NextRequest, ctx: RouteContext<'/api/vehicles/[id]/status'>) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const vehicle = await loadOwnedVehicle(supabase, user, id)
    const raw = await getLatestMessage(vehicle.flespi_device_id, STATUS_FIELDS)
    return ok(toStatus(raw))
  } catch (err) {
    return handleError(err)
  }
}
