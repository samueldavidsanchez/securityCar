import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { handleError, ok } from '@/lib/api/response'
import { SupabaseAdminRepository } from '@/repositories/AdminRepository'

/** Usuarios de la plataforma, con búsqueda opcional por email/nombre. Solo staff. */
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const q = request.nextUrl.searchParams.get('q') ?? undefined
    const repo = new SupabaseAdminRepository(supabase)
    return ok(await repo.listUsers(q))
  } catch (err) {
    return handleError(err)
  }
}
