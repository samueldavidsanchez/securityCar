'use client'

import { formatRelativeTime, formatSpeed, isOnline } from '@securitycar/shared'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus } from '@/hooks/useVehicles'

// MapLibre touches `window` — load client-only.
const VehicleMap = dynamic(
  () => import('@/components/map/VehicleMap').then(m => m.VehicleMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-[--color-bg-surface]" /> }
)

export default function MapPage() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const [recenter, setRecenter] = useState(0)
  const now = useNow()

  if (!selected) return <EmptyState />

  const online = isOnline(status?.last_seen ?? null, now)

  return (
    <div className="relative h-full w-full">
      <VehicleMap
        position={status?.position ?? null}
        label={selected.alias}
        recenterSignal={recenter}
      />

      {/* Vehicle info card — top left */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-2xl border border-[--color-border] bg-[--color-bg-surface]/95 p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${online ? 'bg-[--color-success]' : 'bg-[--color-text-muted]'}`}
          />
          <span className="text-sm font-semibold">{selected.alias}</span>
        </div>
        <div className="mt-1 text-xs text-[--color-text-muted]">
          {formatSpeed(status?.speed ?? null)} · {formatRelativeTime(status?.last_seen ?? null)}
        </div>
      </div>

      {/* Recenter button — bottom right (above mobile tab bar) */}
      <button
        onClick={() => setRecenter(n => n + 1)}
        disabled={!status?.position}
        className="absolute bottom-4 right-4 rounded-full border border-[--color-border] bg-[--color-bg-surface] px-4 py-2.5 text-sm font-medium shadow-lg transition-colors hover:bg-[--color-bg-elevated] disabled:opacity-50"
      >
        🎯 Centrar
      </button>
    </div>
  )
}
