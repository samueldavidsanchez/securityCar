import type { NextRequest } from 'next/server'
import { UpdateNotificationPreferencesSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { attachDeviceToIgnitionCalc } from '@/lib/flespi/client'
import { SupabaseNotificationSettingsRepository } from '@/repositories/NotificationSettingsRepository'

type Ctx = RouteContext<'/api/vehicles/[id]/notifications'>

/**
 * Qué alertas push quiere recibir el usuario ACTUAL para este vehículo. Basta
 * con rol viewer: elegir tus propias notificaciones no cambia nada del vehículo.
 */
export async function GET(request: NextRequest, ctx: Ctx) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'viewer')
    const repo = new SupabaseNotificationSettingsRepository(supabase)
    return ok(await repo.getForVehicle(user.id, id))
  } catch (err) {
    return handleError(err)
  }
}

export async function PUT(request: NextRequest, ctx: Ctx) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const body = await request.json().catch(() => null)
    const parsed = UpdateNotificationPreferencesSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }
    const vehicle = await loadAccessibleVehicle(supabase, id, 'viewer')
    // Primero Flespi: si falla, el switch no queda "activado" sin que nada
    // vaya a dispararlo.
    if (parsed.data.ignition_on || parsed.data.ignition_off) {
      await attachDeviceToIgnitionCalc(vehicle.device.flespi_device_id)
    }
    const repo = new SupabaseNotificationSettingsRepository(supabase)
    return ok(await repo.update(user.id, id, parsed.data))
  } catch (err) {
    return handleError(err)
  }
}
