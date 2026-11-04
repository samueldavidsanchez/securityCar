import type { VehicleEventType } from './event'

/**
 * Eventos que pueden generar un push. Solo se listan los que hoy tienen un
 * productor real (calculators de Flespi → /api/webhooks/flespi/intervals):
 * mostrar un switch para algo que nunca llega confundiría al cliente.
 */
export const ALERT_EVENT_TYPES = ['ignition_on', 'ignition_off', 'geofence_in', 'geofence_out'] as const

export type AlertEventType = (typeof ALERT_EVENT_TYPES)[number] & VehicleEventType

/**
 * Valor cuando el usuario no ha tocado el switch (sin fila en
 * `notification_settings`). Encendido/apagado vienen desactivados: ocurren en
 * cada viaje y, activados por defecto, la app se sentiría ruidosa. Las
 * geocercas sí, porque el usuario las creó justamente para enterarse.
 */
export const ALERT_DEFAULTS: Record<AlertEventType, boolean> = {
  ignition_on: false,
  ignition_off: false,
  geofence_in: true,
  geofence_out: true,
}

export const ALERT_LABEL: Record<AlertEventType, { title: string; description: string }> = {
  ignition_on: { title: 'Encendido del motor', description: 'Cuando el vehículo se enciende' },
  ignition_off: { title: 'Apagado del motor', description: 'Cuando el vehículo se apaga' },
  geofence_in: { title: 'Entrada a geocerca', description: 'Según lo configurado en cada zona' },
  geofence_out: { title: 'Salida de geocerca', description: 'Según lo configurado en cada zona' },
}

/** Preferencias del usuario actual para un vehículo, ya resueltas con los defaults. */
export type NotificationPreferences = Record<AlertEventType, boolean>
