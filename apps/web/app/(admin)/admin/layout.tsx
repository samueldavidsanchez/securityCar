import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { LayoutGrid, Radio, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/admin/vehicles', label: 'Vehículos', icon: LayoutGrid },
  { href: '/admin/devices', label: 'Dispositivos', icon: Radio },
  { href: '/admin/users', label: 'Usuarios', icon: Users },
]

/**
 * Gate real de esta sección: `proxy.ts` solo comprueba que haya sesión (mismo
 * principio que `(app)/layout.tsx`), la autorización de admin vive aquí.
 * Agregar el round-trip a la BD (`is_admin()`) al matcher de proxy.ts no vale
 * la pena para un puñado de rutas internas.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isAdmin } = await supabase.rpc('is_admin')
  if (!isAdmin) {
    // En el subdominio admin, /dashboard no existe (proxy.ts lo bloquea ahí):
    // redirigir causaría un loop. Se muestra un mensaje en vez de redirigir.
    const host = (await headers()).get('host')
    if (process.env.ADMIN_HOST && host === process.env.ADMIN_HOST) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-center">
          <p className="text-sm text-(--color-text-muted)">No tenés permisos de administrador.</p>
        </div>
      )
    }
    redirect('/dashboard')
  }

  return (
    <div className="flex h-full">
      <nav className="flex w-56 shrink-0 flex-col gap-1 border-r border-(--color-border) bg-(--color-bg-surface) p-4">
        <span className="mb-3 px-2 text-xs font-semibold tracking-wide text-(--color-text-muted) uppercase">
          Admin
        </span>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-(--color-text-secondary) transition-colors duration-150 hover:bg-(--color-bg-elevated) hover:text-(--color-text-primary)"
          >
            <Icon size={16} strokeWidth={2} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}
