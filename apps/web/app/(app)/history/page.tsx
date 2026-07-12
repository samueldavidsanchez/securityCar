'use client'

import type { TripSummary } from '@securitycar/shared'
import { formatDistance, formatDuration } from '@securitycar/shared'
import useSWR from 'swr'
import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { Card } from '@/components/ui/Card'
import { fetcher } from '@/hooks/fetcher'

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryPage() {
  const { selected } = useVehicleContext()
  const { data: trips, isLoading } = useSWR<TripSummary[]>(
    selected ? `/api/vehicles/${selected.id}/trips` : null,
    fetcher
  )

  if (!selected) return <EmptyState />

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Historial</h1>
        <p className="text-sm text-[--color-text-muted]">Últimos viajes · {selected.alias}</p>
      </div>

      {isLoading && <p className="text-sm text-[--color-text-muted]">Cargando viajes…</p>}

      {!isLoading && (!trips || trips.length === 0) && (
        <Card className="text-center text-sm text-[--color-text-muted]">
          No hay viajes registrados en los últimos 7 días.
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {trips?.map(trip => (
          <Card key={trip.id} className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{formatDateTime(trip.started_at)}</span>
              <span className="text-xs text-[--color-text-muted]">
                → {formatDateTime(trip.ended_at)}
              </span>
            </div>
            <div className="flex gap-4 text-right">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[--color-accent]">
                  {formatDistance(trip.distance_km)}
                </span>
                <span className="text-xs text-[--color-text-muted]">distancia</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{formatDuration(trip.duration_seconds)}</span>
                <span className="text-xs text-[--color-text-muted]">duración</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
