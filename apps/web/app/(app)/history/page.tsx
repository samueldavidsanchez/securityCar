'use client'

import type { GpsPosition, TripSummary, VehicleEvent } from '@securitycar/shared'
import { EVENT_LABEL, formatDistance, formatDuration } from '@securitycar/shared'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { TripRouteMap } from '@/components/map/TripRouteMap'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
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

function epoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

interface TripRowProps {
  vehicleId: string
  trip: TripSummary
  open: boolean
  onToggle: () => void
}

function TripRow({ vehicleId, trip, open, onToggle }: TripRowProps) {
  // Solo pide la ruta cuando la tarjeta está abierta.
  const { data: route, isLoading } = useSWR<GpsPosition[]>(
    open ? `/api/vehicles/${vehicleId}/trips/path?from=${epoch(trip.started_at)}&to=${epoch(trip.ended_at)}` : null,
    fetcher
  )

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-bg-surface] transition-all duration-150 hover:border-[--color-text-muted] hover:shadow-md hover:shadow-black/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center justify-between gap-4 p-4 text-left"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{formatDateTime(trip.started_at)}</span>
          <span className="text-xs text-[--color-text-muted]">→ {formatDateTime(trip.ended_at)}</span>
        </div>
        <div className="flex items-center gap-4 text-right">
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
          <ChevronDown
            size={16}
            className={`text-[--color-text-muted] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-[--color-border] p-3">
          {isLoading && (
            <p className="py-8 text-center text-sm text-[--color-text-muted]">Cargando ruta…</p>
          )}
          {!isLoading && (!route || route.length === 0) && (
            <p className="py-8 text-center text-sm text-[--color-text-muted]">
              Sin puntos GPS para este viaje.
            </p>
          )}
          {!isLoading && route && route.length > 0 && <TripRouteMap route={route} />}
        </div>
      )}
    </div>
  )
}

export default function HistoryPage() {
  const { selected } = useVehicleContext()
  const [openId, setOpenId] = useState<string | null>(null)
  const { data: trips, isLoading } = useSWR<TripSummary[]>(
    selected ? `/api/vehicles/${selected.id}/trips` : null,
    fetcher
  )
  const { data: events } = useSWR<VehicleEvent[]>(
    selected ? `/api/vehicles/${selected.id}/events` : null,
    fetcher
  )

  if (!selected) return <EmptyState />

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Historial</h1>
        <p className="text-sm text-[--color-text-muted]">Últimos viajes · {selected.alias}</p>
      </div>

      {events && events.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[--color-text-secondary]">Eventos recientes</h2>
          {events.slice(0, 10).map(ev => (
            <Card key={ev.id} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-medium">{EVENT_LABEL[ev.event_type]}</span>
              <span className="text-xs text-[--color-text-muted]">{formatDateTime(ev.occurred_at)}</span>
            </Card>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-[74px] rounded-2xl" />
          <Skeleton className="h-[74px] rounded-2xl" />
          <Skeleton className="h-[74px] rounded-2xl" />
        </div>
      )}

      {!isLoading && (!trips || trips.length === 0) && (
        <Card className="text-center text-sm text-[--color-text-muted]">
          No hay viajes registrados en los últimos 7 días.
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {trips?.map(trip => (
          <TripRow
            key={trip.id}
            vehicleId={selected.id}
            trip={trip}
            open={openId === trip.id}
            onToggle={() => setOpenId(prev => (prev === trip.id ? null : trip.id))}
          />
        ))}
      </div>
    </div>
  )
}
