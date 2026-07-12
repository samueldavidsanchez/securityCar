import type { GpsPosition, TelemetryData, TripSummary, VehicleStatus } from '@securitycar/shared'

type Raw = Record<string, unknown>

function num(raw: Raw, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
  }
  return null
}

function bool(raw: Raw, ...keys: string[]): boolean | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'boolean') return v
    if (typeof v === 'number') return v !== 0
  }
  return null
}

function timestamp(raw: Raw): string | null {
  const ts = num(raw, 'timestamp', 'server.timestamp')
  return ts ? new Date(ts * 1000).toISOString() : null
}

/**
 * Fields we request from Flespi. Covers the common naming across protocols.
 */
export const STATUS_FIELDS = [
  'timestamp',
  'position.latitude',
  'position.longitude',
  'position.altitude',
  'position.direction',
  'position.speed',
  'engine.ignition.status',
  'vehicle.speed',
  'battery.voltage',
  'external.powersource.voltage',
  'device.battery.voltage',
  'engine.block.status',
]

export const TELEMETRY_FIELDS = [
  ...STATUS_FIELDS,
  'vehicle.mileage',
  'engine.hours',
  'engine.rpm',
  'can.engine.temperature',
  'engine.coolant.temperature',
]

export function toPosition(raw: Raw): GpsPosition | null {
  const lat = num(raw, 'position.latitude')
  const lng = num(raw, 'position.longitude')
  if (lat === null || lng === null) return null
  return {
    lat,
    lng,
    altitude: num(raw, 'position.altitude') ?? undefined,
    heading: num(raw, 'position.direction') ?? undefined,
  }
}

export function toStatus(raw: Raw | null): VehicleStatus {
  if (!raw) {
    return {
      ignition: null,
      speed: null,
      battery_voltage: null,
      last_seen: null,
      position: null,
      engine_blocked: null,
    }
  }
  return {
    ignition: bool(raw, 'engine.ignition.status'),
    speed: num(raw, 'position.speed', 'vehicle.speed'),
    battery_voltage: num(
      raw,
      'external.powersource.voltage',
      'battery.voltage',
      'device.battery.voltage'
    ),
    last_seen: timestamp(raw),
    position: toPosition(raw),
    engine_blocked: bool(raw, 'engine.block.status'),
  }
}

export function toTelemetry(raw: Raw | null): TelemetryData {
  if (!raw) {
    return {
      speed: null,
      odometer: null,
      engine_hours: null,
      battery_voltage: null,
      rpm: null,
      temperature: null,
      ignition: null,
      engine_blocked: null,
      timestamp: null,
    }
  }
  return {
    speed: num(raw, 'position.speed', 'vehicle.speed'),
    odometer: num(raw, 'vehicle.mileage'),
    engine_hours: num(raw, 'engine.hours'),
    battery_voltage: num(
      raw,
      'external.powersource.voltage',
      'battery.voltage',
      'device.battery.voltage'
    ),
    rpm: num(raw, 'engine.rpm'),
    temperature: num(raw, 'can.engine.temperature', 'engine.coolant.temperature'),
    ignition: bool(raw, 'engine.ignition.status'),
    engine_blocked: bool(raw, 'engine.block.status'),
    timestamp: timestamp(raw),
  }
}

export function toTrip(raw: Raw): TripSummary {
  const begin = num(raw, 'trip.begin', 'begin') ?? 0
  const end = num(raw, 'trip.end', 'end') ?? 0
  return {
    id: String(num(raw, 'id') ?? `${begin}-${end}`),
    started_at: begin ? new Date(begin * 1000).toISOString() : '',
    ended_at: end ? new Date(end * 1000).toISOString() : '',
    distance_km: num(raw, 'trip.mileage', 'mileage') ?? 0,
    duration_seconds: end && begin ? end - begin : 0,
    start_position: null,
    end_position: null,
  }
}

/**
 * Maps our high-level command types to Flespi gateway command payloads.
 * The exact command name depends on the device protocol; these are the
 * common defaults and can be overridden per-device later.
 */
export function toFlespiCommand(
  type: string,
  payload?: Record<string, unknown>
): Record<string, unknown> {
  switch (type) {
    case 'engine_block':
      return { name: 'output_control', properties: { output: 1, value: 1 } }
    case 'engine_unblock':
      return { name: 'output_control', properties: { output: 1, value: 0 } }
    case 'request_location':
      return { name: 'get_position' }
    case 'reboot':
      return { name: 'reboot' }
    case 'custom':
    default:
      return payload ?? { name: type }
  }
}
