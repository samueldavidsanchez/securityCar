'use client'

import type { TripSummary } from '@securitycar/shared'
import {
  formatEngineHours,
  formatOdometer,
  formatRelativeTime,
  formatRpm,
  formatSpeed,
  formatTemperature,
  formatVoltage,
  isOnline,
} from '@securitycar/shared'
import { BatteryMedium, Clock, Gauge, KeyRound, Thermometer, Wrench } from 'lucide-react'
import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { Card, Stat } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useNow } from '@/hooks/useNow'
import { useVehicleTelemetry, useVehicleTrips } from '@/hooks/useVehicles'

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Distancia por día, últimos 7 días (hoy incluido), más reciente al final. */
function weeklyDistanceBuckets(trips: TripSummary[]): { label: string; km: number }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today)
    day.setDate(day.getDate() - (6 - i))
    return { day, label: WEEKDAY_LETTERS[day.getDay()], km: 0 }
  })

  for (const trip of trips) {
    if (!trip.started_at) continue
    const started = new Date(trip.started_at)
    started.setHours(0, 0, 0, 0)
    const bucket = days.find(d => d.day.getTime() === started.getTime())
    if (bucket) bucket.km += trip.distance_km
  }

  return days.map(({ label, km }) => ({ label, km }))
}

export default function DashboardPage() {
  const { selected, isLoading } = useVehicleContext()
  const { telemetry } = useVehicleTelemetry(selected?.id ?? null)
  const { trips } = useVehicleTrips(selected?.id ?? null)
  const now = useNow()

  if (isLoading)
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    )
  if (!selected) return <EmptyState />

  const online = isOnline(telemetry?.timestamp ?? null, now)
  const buckets = weeklyDistanceBuckets(trips)
  const maxKm = Math.max(...buckets.map(b => b.km), 1)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{selected.alias}</h1>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            online
              ? 'bg-(--color-success)/15 text-(--color-success)'
              : 'bg-(--color-text-muted)/15 text-(--color-text-muted)'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-(--color-success)' : 'bg-(--color-text-muted)'}`} />
          {online ? 'En línea' : 'Desconectado'}
        </span>
      </div>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Ahora</h2>
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Stat
            label="Ignición"
            value={telemetry?.ignition == null ? '—' : telemetry.ignition ? 'Encendido' : 'Apagado'}
            icon={KeyRound}
          />
        </Card>
        <Card>
          <Stat label="Velocidad" value={formatSpeed(telemetry?.speed ?? null)} icon={Gauge} />
        </Card>
        <Card>
          <Stat label="Batería GPS" value={formatVoltage(telemetry?.battery_voltage ?? null)} icon={BatteryMedium} />
        </Card>
        <Card>
          <Stat label="Temp. motor" value={formatTemperature(telemetry?.temperature ?? null)} icon={Thermometer} />
        </Card>
      </div>

      <Card className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Wrench size={16} strokeWidth={2} aria-hidden />
          Estado del motor
        </span>
        <span
          className={`text-sm font-semibold ${telemetry?.engine_blocked ? 'text-(--color-danger)' : 'text-(--color-success)'}`}
        >
          {telemetry?.engine_blocked ? 'Bloqueado' : 'Normal'}
        </span>
      </Card>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Acumulados</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-(--color-border) bg-(--color-bg-elevated) p-4">
          <Stat label="Odómetro" value={formatOdometer(telemetry?.odometer ?? null)} />
        </div>
        <div className="rounded-2xl border border-(--color-border) bg-(--color-bg-elevated) p-4">
          <Stat label="Horas de motor" value={formatEngineHours(telemetry?.engine_hours ?? null)} />
        </div>
      </div>
      {telemetry?.rpm != null && (
        <Card>
          <Stat label="RPM" value={formatRpm(telemetry.rpm)} />
        </Card>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        Distancia · últimos 7 días
      </h2>
      <Card className="flex flex-col gap-2.5">
        <div className="flex h-14 items-end gap-1.5">
          {buckets.map((b, i) => (
            <div
              key={i}
              className="min-h-1 flex-1 rounded-t rounded-b-sm bg-(--color-accent)"
              style={{ height: `${Math.max((b.km / maxKm) * 100, 3)}%`, opacity: i === 6 ? 1 : 0.65 }}
              title={`${b.km.toFixed(1)} km`}
            />
          ))}
        </div>
        <div className="flex gap-1.5">
          {buckets.map((b, i) => (
            <span key={i} className="flex-1 text-center text-[10px] text-(--color-text-muted)">
              {b.label}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <Stat label="Última conexión" value={formatRelativeTime(telemetry?.timestamp ?? null)} icon={Clock} />
      </Card>
    </div>
  )
}
