'use client'

import { usePathname } from 'next/navigation'
import { VehicleSwitcher } from '@/components/layout/VehicleSwitcher'

interface Props {
  email: string | undefined
}

/**
 * En /map (md+) la página ya tiene su propio contexto de vehículo (card de
 * telemetría flotante + panel "Tus vehículos"), así que este switcher +
 * email quedan redundantes ahí — se ocultan solo en esa ruta+breakpoint.
 * En angosto /map sigue usando el VehicleSheet de siempre, que sí necesita
 * este switcher.
 */
export function AppHeader({ email }: Props) {
  const pathname = usePathname()
  const hideOnDesktop = pathname.startsWith('/map')

  return (
    <header
      className={`flex items-center justify-between border-b border-(--color-border) bg-(--color-bg-surface) px-4 py-3 ${
        hideOnDesktop ? 'md:hidden' : ''
      }`}
    >
      <VehicleSwitcher />
      <span className="text-xs text-(--color-text-muted)">{email}</span>
    </header>
  )
}
