'use client'

import { isOnline } from '@securitycar/shared'
import { LocateFixed } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useVehicleContext } from '@/components/VehicleProvider'
import { VehicleRail } from '@/components/map/VehicleRail'
import { VehicleSheet } from '@/components/map/VehicleSheet'
import { VehicleTelemetryCard } from '@/components/map/VehicleTelemetryCard'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus, useVehicleTelemetry, useVehicleTrips } from '@/hooks/useVehicles'

// MapLibre touches `window` — load client-only.
const VehicleMap = dynamic(
  () => import('@/components/map/VehicleMap').then(m => m.VehicleMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-(--color-bg-surface)" /> }
)

export default function MapPage() {
  const { vehicles, selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const { telemetry } = useVehicleTelemetry(selected?.id ?? null)
  const { trips } = useVehicleTrips(selected?.id ?? null)
  const [recenter, setRecenter] = useState(0)
  const now = useNow()

  if (!selected) return <EmptyState />

  const online = isOnline(status?.last_seen ?? null, now)

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Topbar solo md+ — reemplaza al header global (VehicleSwitcher +
          email), oculto en esta ruta porque la card de telemetría y el
          panel lateral ya dan ese contexto. En angosto no existe: el header
          global sigue ahí, igual que siempre. */}
      <div className="hidden h-14 shrink-0 items-center gap-2.5 border-b border-(--color-border) px-5 md:flex">
        <h1 className="text-base font-semibold">Mapa</h1>
        <span className="flex items-center gap-1.5 text-xs text-(--color-text-secondary)">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-(--color-accent)" />
          {vehicles.length} {vehicles.length === 1 ? 'vehículo' : 'vehículos'} · en vivo
        </span>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <VehicleMap position={status?.position ?? null} label={selected.alias} recenterSignal={recenter} />

          {/* Recenter — arriba a la derecha: en angosto el panel inferior ya
              ocupa el borde de abajo; en md+ la card de telemetría ocupa el
              de la izquierda, así que este borde queda libre en ambos casos. */}
          <button
            type="button"
            onClick={() => setRecenter(n => n + 1)}
            disabled={!status?.position}
            aria-label="Centrar en el vehículo"
            className="shadow-floating absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-(--color-border) bg-(--color-bg-surface) text-(--color-text-primary) transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-(--color-bg-elevated) active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
          >
            <LocateFixed size={18} strokeWidth={2} />
          </button>

          {/* Angosto: bottom sheet. md+: card flotante — ver VehicleRail para el panel lateral. */}
          <div className="md:hidden">
            <VehicleSheet
              alias={selected.alias}
              online={online}
              speed={status?.speed ?? null}
              lastSeen={status?.last_seen ?? null}
              batteryVoltage={status?.battery_voltage ?? null}
              ignition={status?.ignition ?? null}
              trips={trips}
            />
          </div>
          <div className="hidden md:block">
            <VehicleTelemetryCard
              alias={selected.alias}
              plate={selected.plate}
              make={selected.make}
              model={selected.model}
              online={online}
              speed={status?.speed ?? null}
              odometer={telemetry?.odometer ?? null}
              lastSeen={status?.last_seen ?? null}
              batteryVoltage={status?.battery_voltage ?? null}
              ignition={status?.ignition ?? null}
              trips={trips}
            />
          </div>
        </div>

        <div className="hidden md:block">
          <VehicleRail />
        </div>
      </div>
    </div>
  )
}
