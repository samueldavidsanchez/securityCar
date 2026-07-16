'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/map', label: 'Mapa', icon: '🗺️' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/security', label: 'Seguridad', icon: '🔒' },
  { href: '/history', label: 'Historial', icon: '📍' },
  { href: '/settings', label: 'Configuración', icon: '⚙️' },
]

export function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden w-56 shrink-0 flex-col border-r border-[--color-border] bg-[--color-bg-surface] p-4 md:flex">
        <div className="mb-8 px-2">
          <Image
            src="/brand/logo-white.png"
            alt="vivancar"
            width={2085}
            height={364}
            priority
            unoptimized
            className="h-6 w-auto"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {NAV.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-[--color-bg-elevated] text-[--color-text-primary]'
                    : 'text-[--color-text-secondary] hover:bg-[--color-bg-elevated]'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </div>
        <button
          onClick={signOut}
          className="rounded-xl px-3 py-2.5 text-left text-sm text-[--color-text-muted] transition-colors hover:bg-[--color-bg-elevated]"
        >
          Cerrar sesión
        </button>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[--color-border] bg-[--color-bg-surface] md:hidden">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                active ? 'text-[--color-accent]' : 'text-[--color-text-muted]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
