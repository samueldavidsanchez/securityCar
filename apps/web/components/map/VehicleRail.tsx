'use client'

import type { Vehicle } from '@securitycar/shared'
import { formatRelativeTime, isOnline } from '@securitycar/shared'
import { Car, Plus } from 'lucide-react'
import Link from 'next/link'
import { useVehicleContext } from '@/components/VehicleProvider'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus } from '@/hooks/useVehicles'

function VehicleRailRow({ vehicle, selected }: { vehicle: Vehicle; selected: boolean }) {
  const { selectVehicle } = useVehicleContext()
  const { status } = useVehicleStatus(vehicle.id)
  const now = useNow()

  const online = isOnline(status?.last_seen ?? null, now)
  const moving = online && (status?.speed ?? 0) > 3
  const modelLine = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ')

  const dotClass = moving
    ? 'bg-(--color-success)'
    : online
      ? 'bg-(--color-text-secondary)'
      : 'bg-(--color-text-muted)'
  const metaLabel = moving ? 'En vivo' : `${online ? 'Detenido' : 'Desconectado'} · ${formatRelativeTime(status?.last_seen ?? null)}`

  return (
    <button
      type="button"
      onClick={() => selectVehicle(vehicle.id)}
      aria-current={selected}
      className={`flex w-full items-start gap-2.5 rounded-2xl border p-2.5 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 active:scale-[0.99] ${
        selected
          ? 'border-(--color-accent)/60 bg-(--color-accent)/[0.07]'
          : 'border-(--color-border) bg-(--color-bg-elevated) hover:border-(--color-text-muted)'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
          selected ? 'border-(--color-accent)/40 text-(--color-accent)' : 'border-(--color-border) text-(--color-text-secondary)'
        } bg-(--color-bg-surface)`}
      >
        <Car size={17} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-[13px] font-semibold">{vehicle.alias}</span>
          {vehicle.plate && (
            <span className="shrink-0 rounded-full border border-(--color-border) bg-(--color-bg-surface) px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-(--color-text-secondary)">
              {vehicle.plate}
            </span>
          )}
        </span>
        {modelLine && <span className="mt-0.5 block truncate text-[11px] text-(--color-text-muted)">{modelLine}</span>}
        <span
          className={`mt-1.5 flex items-center gap-1.5 text-[11px] ${online ? 'text-(--color-text-secondary)' : 'text-(--color-text-muted)'}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />
          {metaLabel}
        </span>
      </span>
    </button>
  )
}

/**
 * Panel lateral de vehículos — solo md+ (ver map/page.tsx). En angosto
 * el cambio de vehículo sigue viviendo en el VehicleSwitcher del header,
 * que funciona a cualquier ancho.
 */
export function VehicleRail() {
  const { vehicles, selected } = useVehicleContext()

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-(--color-border) bg-(--color-bg-surface)">
      <div className="flex items-baseline justify-between px-4 pb-2.5 pt-4">
        <h2 className="text-sm font-semibold">Tus vehículos</h2>
        <span className="text-xs text-(--color-text-muted)">{vehicles.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {vehicles.map(v => (
          <VehicleRailRow key={v.id} vehicle={v} selected={v.id === selected?.id} />
        ))}
      </div>
      <div className="border-t border-(--color-border) p-3">
        <Link
          href="/settings"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-(--color-border) px-4 py-2.5 text-sm text-(--color-text-secondary) transition-all duration-150 ease-out hover:border-(--color-text-muted) hover:bg-(--color-bg-elevated) hover:text-(--color-text-primary)"
        >
          <Plus size={15} strokeWidth={2} aria-hidden />
          Agregar vehículo
        </Link>
      </div>
    </aside>
  )
}
