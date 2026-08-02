import type {
  GpsPosition,
  TelemetryData,
  TripSummary,
  VehicleEventType,
  VehicleStatus,
} from '@securitycar/shared'

type Raw = Record<string, unknown>

function num(raw: Raw, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = raw[k]
    if (typeof v === 'number' && !Number.isNaN(v)) return v
  }
  return null
}

// Algunos trackers reportan velocidades corruptas (p. ej. 17990 "km/h", visto
// en producción); fuera de este rango el valor se trata como "sin dato".
const MAX_PLAUSIBLE_SPEED_KMH = 250

function speedKmh(raw: Raw): number | null {
  const v = num(raw, 'position.speed', 'vehicle.speed')
  return v !== null && v >= 0 && v <= MAX_PLAUSIBLE_SPEED_KMH ? v : null
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

/**
 * Convierte los mensajes crudos de un viaje en una polilínea de puntos
 * válidos, en orden cronológico. Descarta mensajes sin posición o con
 * `position.valid === false` (evita saltos a (0,0) o fixes malos).
 */
export function toRoute(raws: Raw[]): GpsPosition[] {
  const points: GpsPosition[] = []
  for (const raw of raws) {
    if (bool(raw, 'position.valid') === false) continue
    const point = toPosition(raw)
    if (point) points.push(point)
  }
  return points
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
    speed: speedKmh(raw),
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
    speed: speedKmh(raw),
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

function latLng(raw: Raw, latKeys: string[], lngKeys: string[]): { lat: number; lng: number } | null {
  const lat = num(raw, ...latKeys)
  const lng = num(raw, ...lngKeys)
  return lat !== null && lng !== null ? { lat, lng } : null
}

/**
 * Transforma un INTERVALO de un calculator de trips de Flespi en TripSummary.
 * Los intervalos exponen `begin`/`end`/`duration`/`mileage`; los nombres de
 * los campos de posición dependen de la configuración del calculator, de ahí
 * la lista de candidatos.
 */
export function toTrip(raw: Raw): TripSummary {
  const begin = num(raw, 'begin', 'trip.begin') ?? 0
  const end = num(raw, 'end', 'trip.end') ?? 0
  return {
    id: String(num(raw, 'id') ?? `${begin}-${end}`),
    started_at: begin ? new Date(begin * 1000).toISOString() : '',
    ended_at: end ? new Date(end * 1000).toISOString() : '',
    distance_km: num(raw, 'mileage', 'trip.mileage') ?? 0,
    duration_seconds: num(raw, 'duration') ?? (end && begin ? end - begin : 0),
    start_position: latLng(
      raw,
      ['begin_position.latitude', 'begin.position.latitude'],
      ['begin_position.longitude', 'begin.position.longitude']
    ),
    end_position: latLng(
      raw,
      ['end_position.latitude', 'end.position.latitude'],
      ['end_position.longitude', 'end.position.longitude']
    ),
  }
}

// ─── Webhook de eventos ────────────────────────────────────

/** Un registro del webhook, ya normalizado a algo accionable. */
export type ParsedWebhookRecord =
  | { kind: 'command_ack'; flespiDeviceId: number; flespiCommandId: number }
  | {
      kind: 'event'
      flespiDeviceId: number
      eventType: VehicleEventType
      occurredAt: string
      flespiEventId: string | null
      payload: Raw
    }
  | { kind: 'ignored' }

/** Mapea el nombre de evento que emite Flespi a nuestro tipo de negocio. */
const EVENT_TYPE_MAP: Record<string, VehicleEventType> = {
  ignition_on: 'ignition_on',
  ignition_off: 'ignition_off',
  movement: 'movement',
  moving: 'movement',
  disconnected: 'disconnected',
  connection_lost: 'disconnected',
  low_battery: 'low_battery',
  battery_low: 'low_battery',
  geofence_in: 'geofence_in',
  geofence_enter: 'geofence_in',
  geofence_out: 'geofence_out',
  geofence_exit: 'geofence_out',
  sos: 'sos',
  panic: 'sos',
}

function deviceId(raw: Raw): number | null {
  return num(raw, 'device.id', 'device_id', 'did')
}

/**
 * Interpreta un registro del webhook de Flespi.
 *
 * Solo se persisten dos cosas: ACKs de comando (para cerrar el ciclo a
 * 'confirmed') y eventos de negocio ya tipados. La telemetría suelta sin tipo
 * se ignora — no es un hecho de negocio y almacenarla violaría la regla de "no
 * guardar telemetría".
 *
 * Los nombres de campo dependen de cómo se configuren los streams/calc de
 * Flespi; la extracción es defensiva y el mapeo es fácil de ampliar.
 */
export function parseWebhookRecord(raw: Raw): ParsedWebhookRecord {
  const did = deviceId(raw)
  if (did === null) return { kind: 'ignored' }

  // ACK de comando: Flespi reporta el id del comando ejecutado/confirmado.
  const cmdId = num(raw, 'command.id', 'command_id', 'ackid')
  if (cmdId !== null) {
    return { kind: 'command_ack', flespiDeviceId: did, flespiCommandId: cmdId }
  }

  // Evento tipado.
  const rawType = raw['event.type'] ?? raw['event'] ?? raw['name'] ?? raw['type']
  const mapped = typeof rawType === 'string' ? EVENT_TYPE_MAP[rawType.toLowerCase()] : undefined

  // Fallback: derivar ignición de la telemetría cuando venga el flag pero no un
  // nombre de evento explícito.
  const ignition = bool(raw, 'engine.ignition.status')
  const eventType: VehicleEventType | null =
    mapped ?? (ignition === true ? 'ignition_on' : ignition === false ? 'ignition_off' : null)

  if (!eventType) return { kind: 'ignored' }

  const ts = num(raw, 'timestamp', 'server.timestamp')
  return {
    kind: 'event',
    flespiDeviceId: did,
    eventType,
    occurredAt: ts ? new Date(ts * 1000).toISOString() : new Date().toISOString(),
    flespiEventId: (() => {
      const id = raw['event.id'] ?? raw['id']
      return typeof id === 'string' || typeof id === 'number' ? String(id) : null
    })(),
    payload: raw,
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
