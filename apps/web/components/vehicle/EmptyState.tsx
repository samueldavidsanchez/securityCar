import Link from 'next/link'

export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-4xl">🚗</div>
      <h2 className="text-lg font-semibold">Aún no tienes vehículos</h2>
      <p className="max-w-xs text-sm text-[--color-text-muted]">
        Agrega tu primer vehículo con su ID de dispositivo Flespi para empezar a monitorearlo.
      </p>
      <Link
        href="/settings"
        className="mt-2 rounded-xl bg-[--color-accent] px-4 py-2.5 text-sm font-semibold text-[--color-on-accent] hover:bg-[--color-accent-hover]"
      >
        Agregar vehículo
      </Link>
    </div>
  )
}
