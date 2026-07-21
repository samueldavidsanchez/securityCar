import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'

/**
 * Previsualiza una invitación antes de aceptarla: qué vehículo y con qué rol.
 * Va por RPC (`invitation_preview`, SECURITY DEFINER) porque el invitado no
 * puede leer la tabla `invitations`.
 */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/invitations/[token]'>) {
  try {
    const { supabase } = await getAuthContext(request)
    const { token } = await ctx.params

    const { data, error } = await supabase
      .rpc('invitation_preview', { p_token: token })
      .maybeSingle<{ vehicle_alias: string; role: string; expires_at: string }>()
    if (error) throw error
    if (!data) return fail('Invitación inválida, caducada o ya utilizada', 404)

    return ok(data)
  } catch (err) {
    return handleError(err)
  }
}
