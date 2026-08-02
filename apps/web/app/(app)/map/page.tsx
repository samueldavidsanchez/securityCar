'use client'

import { isOnline } from '@securitycar/shared'
import { LocateFixed } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useVehicleContext } from '@/components/VehicleProvider'
import { VehicleSheet } from '@/components/map/VehicleSheet'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus, useVehicleTrips } from '@/hooks/useVehicles'

// MapLibre touches `window` — load client-only.
const VehicleMap = dynamic(
  () => import('@/components/map/VehicleMap').then(m => m.VehicleMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-[--color-bg-surface]" /> }
)

export default function MapPage() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const { trips } = useVehicleTrips(selected?.id ?? null)
  const [recenter, setRecenter] = useState(0)
  const now = useNow()

  if (!selected) return <EmptyState />

  const online = isOnline(status?.last_seen ?? null, now)

  return (
    <div className="relative h-full w-full overflow-hidden">
      <VehicleMap position={status?.position ?? null} label={selected.alias} recenterSignal={recenter} />

      {/* Recenter — arriba a la derecha: el panel inferior ya ocupa ese borde. */}
      <button
        type="button"
        onClick={() => setRecenter(n => n + 1)}
        disabled={!status?.position}
        aria-label="Centrar en el vehículo"
        className="absolute right-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[--color-border] bg-[--color-bg-surface] text-[--color-text-primary] shadow-lg shadow-black/20 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-[--color-bg-elevated] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
      >
        <LocateFixed size={18} strokeWidth={2} />
      </button>

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
  )
}
