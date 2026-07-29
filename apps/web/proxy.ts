import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/auth/callback']

/**
 * Solo se acepta una ruta interna. Sin esta comprobación, `?next=https://…`
 * convertiría el login en un redirector abierto hacia un sitio de phishing.
 * `//host` se rechaza porque el navegador lo interpreta como protocolo-relativo.
 */
function safeNext(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null
  return next
}

/**
 * Runs on every matched request (Node.js runtime in Next.js 16).
 * Refreshes the Supabase session cookie and gates access to the app.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // API routes enforce auth themselves and return JSON 401s — never redirect
  // them to HTML. The session cookie has already been refreshed above.
  if (pathname.startsWith('/api')) {
    return response
  }

  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  // Unauthenticated user trying to reach the app → send to login, remembering
  // where they were going. Necesario para los enlaces de invitación: quien
  // recibe uno normalmente aún no tiene sesión (o ni cuenta).
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    const target = pathname + url.search
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', target)
    return NextResponse.redirect(url)
  }

  // Authenticated user on an auth page → send to the map, o al destino que
  // traía si lo hay.
  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = safeNext(request.nextUrl.searchParams.get('next')) ?? '/map'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except static assets (anything with a file extension —
    // covers /brand/*.png and similar public files, not just _next/*),
    // images and the Flespi webhook. Without the extension exclusion,
    // unauthenticated requests for public assets (e.g. the login page's own
    // logo) get redirected to /login instead of served, breaking the image.
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\..*$).*)',
  ],
}
