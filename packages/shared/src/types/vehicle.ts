export interface Vehicle {
  id: string
  owner_id: string
  flespi_device_id: number
  alias: string
  plate: string | null
  make: string | null
  model: string | null
  year: number | null
  created_at: string
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
