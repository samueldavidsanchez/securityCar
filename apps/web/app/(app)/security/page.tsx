'use client'

import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { Card } from '@/components/ui/Card'
import { CommandButton } from '@/components/security/CommandButton'
import { useVehicleStatus } from '@/hooks/useVehicles'

export default function SecurityPage() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)

  if (!selected) return <EmptyState />

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Seguridad</h1>
        <p className="text-sm text-[--color-text-muted]">{selected.alias}</p>
      </div>

      <Card className="border-[--color-warning]/40 bg-[--color-warning]/5">
        <div className="flex items-center gap-2 text-sm text-[--color-warning]">
          <span>⚠️</span>
          <span>Estas acciones afectan físicamente al vehículo. Úsalas con cuidado.</span>
        </div>
      </Card>

      <Card className="flex flex-col gap-3">
        {status?.engine_blocked ? (
          <CommandButton
            vehicleId={selected.id}
            type="engine_unblock"
            label="Desbloquear motor"
            icon="🟢"
            variant="success"
            confirmText="Se permitirá que el motor arranque nuevamente. ¿Continuar?"
          />
        ) : (
          <CommandButton
            vehicleId={selected.id}
            type="engine_block"
            label="Bloquear motor"
            icon="🔴"
            variant="danger"
            confirmText="El motor no podrá arrancar hasta que lo desbloquees. ¿Continuar?"
          />
        )}

        <CommandButton
          vehicleId={selected.id}
          type="request_location"
          label="Solicitar ubicación"
          icon="📍"
          variant="primary"
          confirmText="Se pedirá al dispositivo una actualización de ubicación inmediata."
        />

        <CommandButton
          vehicleId={selected.id}
          type="reboot"
          label="Reiniciar dispositivo GPS"
          icon="🔄"
          variant="secondary"
          confirmText="El GPS se reiniciará y estará desconectado unos segundos. ¿Continuar?"
        />
      </Card>
    </div>
  )
}
