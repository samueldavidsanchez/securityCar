'use client'

import { ALERT_EVENT_TYPES, ALERT_LABEL, type Vehicle } from '@securitycar/shared'
import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'

/**
 * Switches de alertas push del usuario actual para un vehículo. Las alertas
 * llegan a la app móvil; desde la web solo se configuran.
 */
export function NotificationPreferencesCard({ vehicle }: { vehicle: Vehicle }) {
  const { preferences, toggle } = useNotificationPreferences(vehicle.id)
  const [error, setError] = useState<string | null>(null)

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold">Notificaciones · {vehicle.alias}</h2>
        <p className="mt-0.5 text-xs text-(--color-text-muted)">
          Llegan como notificación a la app móvil de vivancar. Cada persona con acceso elige las suyas.
        </p>
      </div>
      <div className="flex flex-col divide-y divide-(--color-border)">
        {ALERT_EVENT_TYPES.map(type => (
          <label key={type} className="flex cursor-pointer items-center justify-between gap-3 py-2.5">
            <span className="flex flex-col">
              <span className="text-sm">{ALERT_LABEL[type].title}</span>
              <span className="text-xs text-(--color-text-muted)">{ALERT_LABEL[type].description}</span>
            </span>
            {preferences ? (
              <input
                type="checkbox"
                role="switch"
                checked={preferences[type]}
                onChange={async () => setError(await toggle(type))}
                className="h-5 w-5 shrink-0 accent-(--color-accent)"
              />
            ) : (
              <Skeleton className="h-5 w-5" />
            )}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-(--color-danger)">{error}</p>}
    </Card>
  )
}
