import type { VehicleRole } from './sharing'

export type DeviceStatus = 'provisioned' | 'active' | 'retired'

/** Hardware asociado al vehículo. Se resuelve por join desde `devices`. */
export interface VehicleDevice {
  imei: string
  flespi_device_id: number
  status: DeviceStatus
}

export interface Vehicle {
  id: string
  owner_id: string
  device_id: string
  alias: string
  plate: string | null
  make: string | null
  model: string | null
  year: number | null
  created_at: string
  device: VehicleDevice
  /**
   * Rol del usuario que hace la petición sobre este vehículo. Campo calculado
   * en Postgres (`effective_role`), no una columna: permite a la UI ocultar
   * acciones que el servidor va a rechazar de todas formas.
   */
  effective_role: VehicleRole
}

export interface VehicleWithStatus extends Vehicle {
  status?: VehicleStatus
}

export interface VehicleStatus {
  ignition: boolean | null
  speed: number | null
  battery_voltage: number | null
  last_seen: string | null
  position: GpsPosition | null
  engine_blocked: boolean | null
}

export interface GpsPosition {
  lat: number
  lng: number
  altitude?: number
  accuracy?: number
  heading?: number
}

export type CommandType =
  | 'engine_block'
  | 'engine_unblock'
  | 'request_location'
  | 'reboot'
  | 'custom'

export interface CommandLog {
  id: string
  vehicle_id: string
  user_id: string
  command_type: CommandType
  payload: Record<string, unknown> | null
  status: 'pending' | 'sent' | 'confirmed' | 'failed'
  flespi_response: Record<string, unknown> | null
  created_at: string
}
