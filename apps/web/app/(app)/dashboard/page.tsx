'use client'

import { formatRelativeTime, formatSpeed, formatVoltage, isOnline } from '@securitycar/shared'
import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { Card, Stat } from '@/components/ui/Card'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus } from '@/hooks/useVehicles'

export default function DashboardPage() {
  const { selected, isLoading } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const now = useNow()

  if (isLoading) return <div className="p-6 text-sm text-[--color-text-muted]">Cargando…</div>
  if (!selected) return <EmptyState />

  const online = isOnline(status?.last_seen ?? null, now)

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{selected.alias}</h1>
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            online
              ? 'bg-[--color-success]/15 text-[--color-success]'
              : 'bg-[--color-text-muted]/15 text-[--color-text-muted]'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-[--color-success]' : 'bg-[--color-text-muted]'}`} />
          {online ? 'En línea' : 'Desconectado'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <Stat
            label="Estado del motor"
            value={status?.engine_blocked ? 'Bloqueado' : 'Normal'}
            icon="🔧"
            accent={status?.engine_blocked ?? false}
          />
        </Card>
        <Card>
          <Stat
            label="Ignición"
            value={status?.ignition == null ? '—' : status.ignition ? 'Encendido' : 'Apagado'}
            icon="🔑"
          />
        </Card>
        <Card>
          <Stat label="Velocidad" value={formatSpeed(status?.speed ?? null)} icon="⚡" />
        </Card>
        <Card>
          <Stat label="Batería GPS" value={formatVoltage(status?.battery_voltage ?? null)} icon="🔋" />
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <Stat label="Última conexión" value={formatRelativeTime(status?.last_seen ?? null)} icon="🕒" />
          {status?.position && (
            <span className="text-xs text-[--color-text-muted]">
              {status.position.lat.toFixed(5)}, {status.position.lng.toFixed(5)}
            </span>
          )}
        </div>
      </Card>
    </div>
  )
}
