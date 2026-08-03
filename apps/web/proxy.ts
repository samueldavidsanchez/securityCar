import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/auth/callback']

/**
 * Dominio dedicado del panel admin (opcional, p.ej. `admin.vivancar.cl`). Es
 * el MISMO deploy de `apps/web` — no hay proyecto Vercel aparte — solo un
 * dominio adicional apuntando al mismo proyecto. Si está configurado:
 *   - en ese host, solo /admin, /api/admin y las rutas de auth responden;
 *     cualquier otra ruta redirige a /admin/vehicles.
 *   - en el dominio normal, /admin y /api/admin devuelven 404: el panel solo
 *     es alcanzable desde ADMIN_HOST.
 * Es una capa de opacidad, no la barrera de seguridad real — esa sigue
 * siendo `is_admin()` + RLS (migración 0006), que no depende del dominio.
 * Sin la env var (dev local, o mientras no se configure el subdominio), el
 * comportamiento es exactamente el de antes.
 */
const ADMIN_HOST = process.env.ADMIN_HOST

function isAdminPath(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/')
  )
}

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
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))

  if (ADMIN_HOST) {
    const onAdminHost = request.nextUrl.hostname === ADMIN_HOST
    if (onAdminHost && !isAdminPath(pathname) && !isPublic) {
      if (pathname.startsWith('/api')) return new NextResponse(null, { status: 404 })
      const url = request.nextUrl.clone()
      url.pathname = '/admin/vehicles'
      url.search = ''
      return NextResponse.redirect(url)
    }
    if (!onAdminHost && isAdminPath(pathname)) {
      return new NextResponse(null, { status: 404 })
    }
  }

  // API routes enforce auth themselves and return JSON 401s — never redirect
  // them to HTML. The session cookie has already been refreshed above.
  if (pathname.startsWith('/api')) {
    return response
  }

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

  // Authenticated user on an auth page → send to the map (o /admin/vehicles
  // en el subdominio admin, para no rebotar por el bloqueo de arriba), o al
  // destino que traía si lo hay.
  if (user && isPublic) {
    const url = request.nextUrl.clone()
    const fallback = ADMIN_HOST && request.nextUrl.hostname === ADMIN_HOST ? '/admin/vehicles' : '/map'
    url.pathname = safeNext(request.nextUrl.searchParams.get('next')) ?? fallback
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
