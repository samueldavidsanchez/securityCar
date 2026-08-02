'use client'

import type { TripSummary } from '@securitycar/shared'
import { formatDistance, formatDuration, formatRelativeTime, formatSpeed, formatVoltage } from '@securitycar/shared'
import { BatteryMedium, ChevronUp, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

interface Props {
  alias: string
  online: boolean
  speed: number | null
  lastSeen: string | null
  batteryVoltage: number | null
  ignition: boolean | null
  trips: TripSummary[]
}

function formatTripWhen(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Panel flotante inferior sobre el mapa. Colapsado muestra solo lo esencial
 * (alias, estado, velocidad); expandido suma batería/ignición y los últimos
 * viajes. La animación usa el truco grid-template-rows 0fr→1fr en vez de
 * medir alturas en píxeles — anima a "auto" de forma nativa y robusta.
 */
export function VehicleSheet({ alias, online, speed, lastSeen, batteryVoltage, ignition, trips }: Props) {
  const [expanded, setExpanded] = useState(false)
  const recentTrips = trips.slice(0, 3)

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[75%] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-[--color-border] bg-[--color-bg-surface]/92 px-4 pb-4 pt-2.5 shadow-lg shadow-black/30 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        aria-label={expanded ? 'Contraer panel del vehículo' : 'Expandir panel del vehículo'}
        className="flex flex-col items-center gap-3 pb-1"
      >
        <span className="h-1 w-9 rounded-full bg-[--color-border]" />
        <span className="flex w-full items-center justify-between gap-3">
          <span className="flex flex-col items-start">
            <span className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${online ? 'animate-pulse bg-[--color-success]' : 'bg-[--color-text-muted]'}`}
              />
              <span className="text-base font-semibold">{alias}</span>
            </span>
            <span className="mt-0.5 text-xs text-[--color-text-muted]">
              {formatSpeed(speed)} · {formatRelativeTime(lastSeen)}
            </span>
          </span>
          <ChevronUp
            size={18}
            className={`shrink-0 text-[--color-text-muted] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      <div
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pt-2">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-[--color-border] bg-[--color-bg-elevated] px-3 py-2.5">
              <BatteryMedium size={15} strokeWidth={2} className="shrink-0 text-[--color-text-muted]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10.5px] text-[--color-text-muted]">Batería</p>
                <p className="text-sm font-semibold tabular-nums">{formatVoltage(batteryVoltage)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-[--color-border] bg-[--color-bg-elevated] px-3 py-2.5">
              <KeyRound size={15} strokeWidth={2} className="shrink-0 text-[--color-text-muted]" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10.5px] text-[--color-text-muted]">Ignición</p>
                <p className="text-sm font-semibold">{ignition == null ? '—' : ignition ? 'Encendido' : 'Apagado'}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[--color-text-muted]">
                Viajes recientes
              </span>
              <Link href="/history" className="text-xs font-medium text-[--color-accent] hover:underline">
                Ver todos
              </Link>
            </div>
            {recentTrips.length === 0 && (
              <p className="py-2 text-xs text-[--color-text-muted]">Sin viajes en los últimos 7 días.</p>
            )}
            {recentTrips.map(trip => (
              <div
                key={trip.id}
                className="flex items-center justify-between border-t border-[--color-border] py-2 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{formatTripWhen(trip.started_at)}</p>
                  <p className="text-[11px] text-[--color-text-muted]">{formatDuration(trip.duration_seconds)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[--color-accent]">
                  {formatDistance(trip.distance_km)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
