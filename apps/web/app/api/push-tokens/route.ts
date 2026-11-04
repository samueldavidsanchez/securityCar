import type { NextRequest } from 'next/server'
import { RegisterPushTokenSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabasePushTokenRepository } from '@/repositories/PushTokenRepository'

/** Registra el token de Expo del teléfono tras el login. */
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthContext(request)
    const body = await request.json().catch(() => null)
    const parsed = RegisterPushTokenSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }
    await new SupabasePushTokenRepository(supabase).register(parsed.data)
    return ok({ registered: true })
  } catch (err) {
    return handleError(err)
  }
}

/** Al cerrar sesión: el teléfono deja de recibir alertas de esta cuenta. */
export async function DELETE(request: NextRequest) {
  try {
    const { supabase } = await getAuthContext(request)
    const body = await request.json().catch(() => null)
    const parsed = RegisterPushTokenSchema.pick({ token: true }).safeParse(body)
    if (!parsed.success) return fail('Token inválido', 422)
    await new SupabasePushTokenRepository(supabase).unregister(parsed.data.token)
    return ok({ registered: false })
  } catch (err) {
    return handleError(err)
  }
}
