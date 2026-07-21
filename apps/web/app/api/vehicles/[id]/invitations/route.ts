import type { NextRequest } from 'next/server'
import { CreateInvitationSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { loadAccessibleVehicle } from '@/lib/api/vehicle'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'

/** Invitaciones pendientes (no aceptadas y no caducadas). Solo el propietario. */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/invitations'>
) {
  try {
    const { supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseSharingRepository(supabase)
    return ok(await repo.listInvitations(id))
  } catch (err) {
    return handleError(err)
  }
}

/**
 * Crea una invitación y devuelve el enlace para compartir.
 *
 * El enlace lleva el token y es la credencial de acceso: quien lo tenga puede
 * aceptar. Se mitiga con un solo uso, caducidad de 7 días y revocación por
 * parte del propietario.
 */
export async function POST(
  request: NextRequest,
  ctx: RouteContext<'/api/vehicles/[id]/invitations'>
) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { id } = await ctx.params
    const body = await request.json().catch(() => ({}))
    const parsed = CreateInvitationSchema.safeParse(body ?? {})
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    await loadAccessibleVehicle(supabase, id, 'owner')
    const repo = new SupabaseSharingRepository(supabase)
    const invitation = await repo.createInvitation(id, user.id, parsed.data)

    const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
    return ok({ invitation, url: `${base}/invite/${invitation.token}` }, 201)
  } catch (err) {
    return handleError(err)
  }
}
