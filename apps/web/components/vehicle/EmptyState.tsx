import { Car } from 'lucide-react'
import Link from 'next/link'

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-(--color-bg-elevated)">
        <Car size={28} strokeWidth={1.75} className="text-(--color-accent)" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold">Aún no tienes vehículos</h2>
      <p className="max-w-xs text-sm text-(--color-text-muted)">
        Agrega tu primer vehículo con el código de activación que viene con tu equipo GPS.
      </p>
      <Link
        href="/settings"
        className="mt-2 rounded-xl bg-(--color-accent) px-4 py-2.5 text-sm font-semibold text-(--color-on-accent) transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-(--color-accent-hover) hover:shadow-lg hover:shadow-black/20 active:scale-[0.97]"
      >
        Agregar vehículo
      </Link>
    </div>
  )
}
