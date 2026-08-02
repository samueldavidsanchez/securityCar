'use client'

import type { TripSummary } from '@securitycar/shared'
import {
  formatDistance,
  formatOdometer,
  formatRelativeTime,
  formatSpeed,
  formatVoltage,
} from '@securitycar/shared'
import { BatteryMedium, Gauge, KeyRound, Milestone } from 'lucide-react'
import Link from 'next/link'

interface Props {
  alias: string
  plate: string | null
  make: string | null
  model: string | null
  online: boolean
  speed: number | null
  odometer: number | null
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
 * Card flotante de telemetría — equivalente de escritorio a VehicleSheet.
 * Solo se monta en md+ (ver map/page.tsx); en angosto se sigue usando el
 * bottom sheet, que ya funciona bien a ese ancho.
 */
export function VehicleTelemetryCard({
  alias,
  plate,
  make,
  model,
  online,
  speed,
  odometer,
  lastSeen,
  batteryVoltage,
  ignition,
  trips,
}: Props) {
  const recentTrips = trips.slice(0, 2)
  const modelLine = [make, model].filter(Boolean).join(' ')

  return (
    <div className="shadow-floating absolute left-4 top-4 z-20 w-80 rounded-2xl border border-(--color-border) bg-(--color-bg-surface)/92 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${online ? 'animate-pulse bg-(--color-success)' : 'bg-(--color-text-muted)'}`}
          />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{alias}</h2>
            <p className="mt-0.5 truncate text-xs text-(--color-text-muted)">
              {modelLine || 'Vehículo'} · {online ? 'En vivo' : formatRelativeTime(lastSeen)}
            </p>
          </div>
        </div>
        {plate && (
          <span className="shrink-0 rounded-full border border-(--color-border) bg-(--color-bg-elevated) px-2.5 py-1 text-[11px] font-semibold tracking-wide text-(--color-text-secondary)">
            {plate}
          </span>
        )}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-(--color-text-muted)">
            <Gauge size={12} strokeWidth={2} aria-hidden />
            Velocidad
          </span>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{formatSpeed(speed)}</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-(--color-text-muted)">
            <Milestone size={12} strokeWidth={2} aria-hidden />
            Odómetro
          </span>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{formatOdometer(odometer)}</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-(--color-text-muted)">
            <BatteryMedium size={12} strokeWidth={2} aria-hidden />
            Batería
          </span>
          <p className="mt-0.5 text-base font-semibold tabular-nums">{formatVoltage(batteryVoltage)}</p>
        </div>
        <div className="rounded-xl border border-(--color-border) bg-(--color-bg-elevated) px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wide text-(--color-text-muted)">
            <KeyRound size={12} strokeWidth={2} aria-hidden />
            Ignición
          </span>
          <p className="mt-0.5 text-base font-semibold">{ignition == null ? '—' : ignition ? 'Sí' : 'No'}</p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-(--color-text-muted)">
          Últimos viajes
        </span>
        <Link href="/history" className="text-xs font-medium text-(--color-accent) hover:underline">
          Ver todos
        </Link>
      </div>
      {recentTrips.length === 0 && (
        <p className="py-2 text-xs text-(--color-text-muted)">Sin viajes en los últimos 7 días.</p>
      )}
      {recentTrips.map(trip => (
        <div
          key={trip.id}
          className="flex items-center justify-between border-t border-(--color-border) py-1.5 text-xs first:border-t-0"
        >
          <span className="text-(--color-text-secondary)">{formatTripWhen(trip.started_at)}</span>
          <span className="font-medium tabular-nums text-(--color-accent)">{formatDistance(trip.distance_km)}</span>
        </div>
      ))}

      <Link
        href="/history"
        className="mt-3.5 flex w-full items-center justify-center rounded-xl bg-(--color-accent) px-4 py-2.5 text-sm font-semibold text-(--color-on-accent) transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-(--color-accent-hover) hover:shadow-lg hover:shadow-black/20 active:scale-[0.97]"
      >
        Ver historial completo
      </Link>
    </div>
  )
}
