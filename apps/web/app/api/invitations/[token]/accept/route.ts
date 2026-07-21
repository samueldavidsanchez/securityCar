import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/**
 * Canjea una invitación. Requiere sesión: el invitado debe registrarse o
 * iniciar sesión antes (la página /invite/[token] lo redirige con ?next=).
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/invitations/[token]/accept'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { token } = await ctx.params
    const repo = new SupabaseSharingRepository(supabase)
    const outcome = await repo.acceptInvitation(token)

    if (!outcome.ok) {
      switch (outcome.reason) {
        case 'ALREADY_OWNER':
          return fail('Ya eres el propietario de este vehículo', 409)
        case 'UNAUTHORIZED':
          return fail('No autorizado', 401)
        default:
          return fail('Invitación inválida, caducada o ya utilizada', 404)
      }
    }

    return ok({ vehicle_id: outcome.vehicleId })
  } catch (err) {
    return handleError(err)
  }
}
