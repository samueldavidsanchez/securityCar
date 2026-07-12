export interface TelemetryData {
  speed: number | null
  odometer: number | null
  engine_hours: number | null
  battery_voltage: number | null
  rpm: number | null
  temperature: number | null
  ignition: boolean | null
  engine_blocked: boolean | null
  timestamp: string | null
}

export interface TripSummary {
  id: string
  started_at: string
  ended_at: string
  distance_km: number
  duration_seconds: number
  start_position: { lat: number; lng: number } | null
  end_position: { lat: number; lng: number } | null
}

// Raw Flespi message — fields depend on device protocol
export interface FlespiMessage {
  timestamp: number
  'position.latitude'?: number
  'position.longitude'?: number
  'position.altitude'?: number
  'position.heading'?: number
  'position.speed'?: number
  'engine.ignition.status'?: boolean
  'vehicle.speed'?: number
  'vehicle.mileage'?: number
  'engine.rpm'?: number
  'battery.voltage'?: number
  'device.battery.voltage'?: number
  'engine.block.status'?: boolean
  'can.engine.temperature'?: number
  [key: string]: unknown
}
