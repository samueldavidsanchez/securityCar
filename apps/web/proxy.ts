import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/auth/callback']

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

  // Unauthenticated user trying to reach the app → send to login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated user on an auth page → send to the map.
  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/map'
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except static assets, images and the Flespi webhook.
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
}
