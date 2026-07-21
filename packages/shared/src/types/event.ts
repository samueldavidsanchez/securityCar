/**
 * Hecho de negocio interpretado a partir de la telemetría de Flespi. NO es
 * telemetría cruda: se persiste porque el usuario recibe una alerta y reclama
 * sobre él, y porque la retención de mensajes en Flespi es finita.
 */
export type VehicleEventType =
  | 'ignition_on'
  | 'ignition_off'
  | 'movement'
  | 'disconnected'
  | 'low_battery'
  | 'geofence_in'
  | 'geofence_out'
  | 'sos'
  | 'other'

export interface VehicleEvent {
  id: string
  vehicle_id: string
  event_type: VehicleEventType
  occurred_at: string
  payload: Record<string, unknown> | null
  created_at: string
}

export const EVENT_LABEL: Record<VehicleEventType, string> = {
  ignition_on: 'Encendido',
  ignition_off: 'Apagado',
  movement: 'Movimiento',
  disconnected: 'Desconexión',
  low_battery: 'Batería baja',
  geofence_in: 'Entró en geocerca',
  geofence_out: 'Salió de geocerca',
  sos: 'SOS',
  other: 'Evento',
}
