import { ClaimVehicleSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { getLatestMessage } from '@/lib/flespi/client'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'

export async function GET(request: Request) {
  try {
    const { supabase } = await getAuthContext(request)
    const repo = new SupabaseVehicleRepository(supabase)
    // Incluye los vehículos compartidos: el alcance lo aplica RLS.
    const vehicles = await repo.findAccessible()
    return ok(vehicles)
  } catch (err) {
    return handleError(err)
  }
}

/**
 * ¿El equipo ha reportado alguna vez? Sirve para avisar al cliente de que el
 * GPS está reclamado pero aún sin señal, en vez de dejarle un mapa vacío sin
 * explicación. Nunca hace fallar el alta: si Flespi no responde devuelve null.
 */
async function hasReportedData(flespiDeviceId: number): Promise<boolean | null> {
  try {
    const message = await getLatestMessage(flespiDeviceId, ['position.latitude'])
    return message !== null
  } catch {
    return null
  }
}

/**
 * Alta de vehículo por reclamación de un dispositivo provisionado.
 *
 * El cliente presenta el código de activación entregado con el equipo; nunca
 * envía un ID de Flespi. La validación y el rate limit viven en la función
 * `claim_device` de Postgres, no aquí, porque un usuario puede llamar al RPC
 * directamente con la anon key y saltarse esta ruta.
 */
export async function POST(request: Request) {
  try {
    const { supabase } = await getAuthContext(request)
    const body = await request.json().catch(() => null)
    const parsed = ClaimVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const repo = new SupabaseVehicleRepository(supabase)
    const outcome = await repo.claim(parsed.data)

    if (!outcome.ok) {
      switch (outcome.reason) {
        case 'RATE_LIMITED':
          return fail('Demasiados intentos. Vuelve a intentarlo en una hora.', 429)
        case 'UNAUTHORIZED':
          return fail('No autorizado', 401)
        default:
          // Mismo mensaje para "no existe" y "ya reclamado": distinguirlos
          // permitiría sondear qué códigos son válidos.
          return fail('Código de activación inválido o ya utilizado', 404)
      }
    }

    const has_signal = await hasReportedData(outcome.vehicle.device.flespi_device_id)
    return ok({ vehicle: outcome.vehicle, has_signal }, 201)
  } catch (err) {
    return handleError(err)
  }
}
