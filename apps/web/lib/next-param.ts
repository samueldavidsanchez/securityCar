/**
 * Lee `?next=` de la URL actual para volver al destino tras autenticarse
 * (típicamente un enlace de invitación abierto sin sesión).
 *
 * Se lee de `window.location` en vez de con `useSearchParams()` a propósito:
 * ese hook obligaría a envolver las páginas de auth en un Suspense y las
 * sacaría del prerender estático. Solo debe llamarse desde manejadores de
 * eventos, nunca durante el render.
 *
 * Valida que sea una ruta interna: `next=https://…` haría del login un
 * redirector abierto. Misma comprobación que en `proxy.ts`.
 */
export function readNextParam(fallback = '/map'): string {
  if (typeof window === 'undefined') return fallback
  const next = new URLSearchParams(window.location.search).get('next')
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}
