import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createCookieClient } from '@/lib/supabase/server'

export class UnauthorizedError extends Error {
  constructor() {
    super('No autorizado')
    this.name = 'UnauthorizedError'
  }
}

export interface AuthContext {
  user: User
  /** Supabase client authenticated as the user, so RLS applies to queries. */
  supabase: SupabaseClient
}

/**
 * Resolves the authenticated user AND a Supabase client scoped to them.
 *
 * Supports both auth transports so web and mobile share the same API:
 *  - Web: session cookies (via @supabase/ssr).
 *  - Mobile: `Authorization: Bearer <access_token>` header.
 *
 * Throws UnauthorizedError when no valid session is present.
 */
export async function getAuthContext(request: Request): Promise<AuthContext> {
  const header = request.headers.get('authorization') ?? ''
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null

  if (bearer) {
    // Forward the JWT on every request so Postgres RLS sees auth.uid().
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false },
      }
    )
    const {
      data: { user },
    } = await supabase.auth.getUser(bearer)
    if (!user) throw new UnauthorizedError()
    return { user, supabase }
  }

  const supabase = await createCookieClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError()
  return { user, supabase }
}
