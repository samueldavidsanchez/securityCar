'use client'

import { hasRole } from '@securitycar/shared'
import { Lock, Navigation, RefreshCw, TriangleAlert, Unlock } from 'lucide-react'
import { useVehicleContext } from '@/components/VehicleProvider'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { Card } from '@/components/ui/Card'
import { CommandButton } from '@/components/security/CommandButton'
import { useVehicleStatus } from '@/hooks/useVehicles'

export default function SecurityPage() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)

  if (!selected) return <EmptyState />

  // El servidor rechaza los comandos de un 'viewer' (403) y la política de
  // command_logs también: esto solo evita ofrecer un botón que va a fallar.
  const canCommand = hasRole(selected.effective_role, 'driver')

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold">Seguridad</h1>
        <p className="text-sm text-[--color-text-muted]">{selected.alias}</p>
      </div>

      {!canCommand && (
        <Card>
          <p className="text-sm text-[--color-text-muted]">
            Tienes acceso de solo lectura a este vehículo. Pide al propietario que te
            asigne el rol de conductor para poder enviar comandos.
          </p>
        </Card>
      )}

      {canCommand && (
        <Card className="border-[--color-warning]/40 bg-[--color-warning]/5">
          <div className="flex items-center gap-2 text-sm text-[--color-warning]">
            <TriangleAlert size={16} strokeWidth={2} className="shrink-0" aria-hidden />
            <span>Estas acciones afectan físicamente al vehículo. Úsalas con cuidado.</span>
          </div>
        </Card>
      )}

      <Card className={`flex flex-col gap-3 ${canCommand ? '' : 'hidden'}`}>
        {status?.engine_blocked ? (
          <CommandButton
            vehicleId={selected.id}
            type="engine_unblock"
            label="Desbloquear motor"
            icon={Unlock}
            variant="success"
            confirmText="Se permitirá que el motor arranque nuevamente. ¿Continuar?"
          />
        ) : (
          <CommandButton
            vehicleId={selected.id}
            type="engine_block"
            label="Bloquear motor"
            icon={Lock}
            variant="danger"
            confirmText="El motor no podrá arrancar hasta que lo desbloquees. ¿Continuar?"
          />
        )}

        <CommandButton
          vehicleId={selected.id}
          type="request_location"
          label="Solicitar ubicación"
          icon={Navigation}
          variant="primary"
          confirmText="Se pedirá al dispositivo una actualización de ubicación inmediata."
        />

        <CommandButton
          vehicleId={selected.id}
          type="reboot"
          label="Reiniciar dispositivo GPS"
          icon={RefreshCw}
          variant="secondary"
          confirmText="El GPS se reiniciará y estará desconectado unos segundos. ¿Continuar?"
        />
      </Card>
    </div>
  )
}
