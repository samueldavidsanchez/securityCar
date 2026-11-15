import 'server-only'
import { FlespiEnvelopeSchema, type CreateGeofenceInput } from '@securitycar/shared'

const FLESPI_BASE = 'https://flespi.io'

export class FlespiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = 'FlespiError'
  }
}

function token(): string {
  const t = process.env.FLESPI_TOKEN
  if (!t) throw new FlespiError('FLESPI_TOKEN is not configured', 500)
  return t
}

/**
 * Devuelve `result` validado como lista de objetos. La validación es de
 * estructura, no de campos: los nombres de parámetros dependen del protocolo
 * del dispositivo y se leen luego de forma defensiva en los transforms.
 */
async function requestResult(path: string, init?: RequestInit): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${FLESPI_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `FlespiToken ${token()}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    // Telemetry must never be cached — always hit Flespi live.
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new FlespiError(`Flespi ${res.status}: ${body || res.statusText}`, res.status)
  }

  const json = await res.json()
  const parsed = FlespiEnvelopeSchema.safeParse(json)
  if (!parsed.success) {
    throw new FlespiError('Respuesta de Flespi con formato inesperado', 502)
  }
  return parsed.data.result
}

/**
 * Fetch the most recent telemetry message for a device.
 * `fields` limits the payload to the parameters we actually render.
 */
export async function getLatestMessage(
  deviceId: number,
  fields: string[]
): Promise<Record<string, unknown> | null> {
  const data = encodeURIComponent(
    JSON.stringify({ count: 1, reverse: true, fields: fields.join(',') })
  )
  const result = await requestResult(`/gw/devices/${deviceId}/messages?data=${data}`)
  return result[0] ?? null
}

/**
 * Viajes calculados por Flespi dentro de una ventana (unix seconds).
 *
 * Usa el CALCULATOR de trips, no los mensajes crudos. El endpoint anterior
 * (`/messages` con {from,to}) devolvía toda la telemetría del rango —decenas de
 * miles de mensajes por día, con timeouts y coste de tráfico— y encima no eran
 * viajes. Un calculator entrega los intervalos ya agregados (inicio, fin,
 * distancia, duración).
 *
 * Requiere `FLESPI_TRIPS_CALC_ID`: el id del calculator de trips creado en el
 * panel de Flespi y asignado a los dispositivos. Sin él, devuelve [] en vez de
 * fallar, para que la pantalla de historial muestre "sin viajes" y no un error.
 */
export async function getTrips(
  deviceId: number,
  from: number,
  to: number
): Promise<Record<string, unknown>[]> {
  const calcId = process.env.FLESPI_TRIPS_CALC_ID
  if (!calcId) {
    console.warn('[flespi] FLESPI_TRIPS_CALC_ID no configurado — sin viajes')
    return []
  }

  // Acota por ventana temporal, más reciente primero. OJO: el endpoint de
  // intervals NO acepta {from,to} (eso es de /messages) — devuelve 400
  // "property is not allowed". Se filtra con una expresión `filter` sobre el
  // campo `begin` del intervalo. El selector `all` recorre todos los intervalos
  // del calc para el dispositivo; `filter` los acota.
  const data = encodeURIComponent(
    JSON.stringify({ filter: `begin>=${from},begin<=${to}`, reverse: true })
  )
  return requestResult(
    `/gw/calcs/${calcId}/devices/${deviceId}/intervals/all?data=${data}`
  )
}

/**
 * Puntos GPS crudos de un dispositivo dentro de una ventana (unix seconds),
 * en orden cronológico. Se usa para dibujar la ruta de UN viaje: la ventana
 * está acotada por el `begin`/`end` del intervalo, así que son cientos de
 * puntos, no el rango completo. A diferencia de `/intervals`, el endpoint
 * `/messages` SÍ acepta el filtro {from,to}.
 */
export async function getTripRoute(
  deviceId: number,
  from: number,
  to: number
): Promise<Record<string, unknown>[]> {
  const data = encodeURIComponent(
    JSON.stringify({
      from,
      to,
      fields: 'timestamp,position.latitude,position.longitude,position.valid',
    })
  )
  return requestResult(`/gw/devices/${deviceId}/messages?data=${data}`)
}

/**
 * Protocolo del equipo en Flespi (`concox`, `teltonika`, `wialon-retranslator`…).
 * Decide qué comando se envía: cada protocolo tiene su propio juego.
 */
export async function getDeviceProtocol(deviceId: number): Promise<string | null> {
  const result = await requestResult(`/gw/devices/${deviceId}?fields=protocol_name`)
  const name = result[0]?.protocol_name
  return typeof name === 'string' ? name : null
}

/**
 * Envía un comando EN TIEMPO REAL (`/commands`, no `/commands-queue`): Flespi
 * lo manda por la conexión activa y espera la respuesta del equipo hasta el
 * `timeout` del comando. El resultado trae `executed` (si el equipo lo
 * ejecutó) y `response`, así que el comando se confirma en la misma llamada,
 * sin webhook. Si el equipo no está conectado, Flespi lo indica de inmediato.
 */
export async function sendCommand(
  deviceId: number,
  command: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const result = await requestResult(`/gw/devices/${deviceId}/commands`, {
    method: 'POST',
    body: JSON.stringify([command]),
  })
  return result[0] ?? {}
}

/**
 * Busca un device en Flespi por su ident (el IMEI), para el alta de
 * dispositivos desde el panel admin. Mismo enfoque que
 * `scripts/provision-device.mjs`: se listan todos y se filtra en local — la
 * sintaxis de `filter` de Flespi es delicada y el número de equipos en esta
 * fase es pequeño. Usa `requestResult`/`token()` en vez del fetch inline del
 * script porque esta ruta corre dentro de la app (con FLESPI_TOKEN ya
 * disponible como server-only), no como CLI standalone.
 */
export async function findDeviceByImei(
  imei: string
): Promise<{ id: number; name: string | null } | null> {
  const result = await requestResult('/gw/devices/all?fields=id,name,configuration')
  const match = result.find(
    d => String((d.configuration as Record<string, unknown> | undefined)?.ident ?? '').trim() === imei
  )
  if (!match) return null
  return { id: match.id as number, name: (match.name as string | null) ?? null }
}

/**
 * Tipo de dispositivo de Flespi por protocolo de hardware. Etapa 1: solo
 * Concox (Jimi IoT genérico, protocolo `concox`). Teltonika se agrega aquí.
 */
const FLESPI_DEVICE_TYPE_ID = { concox: 16 } as const
export type HardwareProtocol = keyof typeof FLESPI_DEVICE_TYPE_ID

/** Un año de historial en Flespi: alcanza para viajes y rutas. */
const DEVICE_MESSAGES_TTL_S = 365 * 24 * 3600

/**
 * Da de alta el equipo en Flespi con `ident` = IMEI. Cuando el GPS se conecte
 * al channel del protocolo, Flespi asocia sus mensajes a este device por el
 * ident — por eso se crea ANTES de instalar el equipo.
 */
export async function createDevice(
  imei: string,
  protocol: HardwareProtocol,
  name: string
): Promise<number> {
  const result = await requestResult('/gw/devices', {
    method: 'POST',
    body: JSON.stringify([
      {
        name,
        device_type_id: FLESPI_DEVICE_TYPE_ID[protocol],
        configuration: { ident: imei },
        messages_ttl: DEVICE_MESSAGES_TTL_S,
      },
    ]),
  })
  const id = result[0]?.id
  if (typeof id !== 'number') throw new FlespiError('Flespi no devolvió el id del dispositivo', 502)
  return id
}

/**
 * Asigna el equipo al calculator de viajes. Sin esto, History queda vacío
 * para equipos nuevos. Idempotente; sin la env var se avisa y se sigue.
 */
export async function attachDeviceToTripsCalc(deviceId: number): Promise<void> {
  await attachDeviceToCalc('FLESPI_TRIPS_CALC_ID', deviceId)
}

// ─── Geocercas ─────────────────────────────────────────────

/**
 * Geometría en el formato de Flespi (`gw/geofences`): `lon` en vez de `lng` y
 * radio en KILÓMETROS (el schema de Flespi acepta 0.001–1000).
 */
function toFlespiGeometry(fence: CreateGeofenceInput): Record<string, unknown> {
  if (fence.shape === 'circle') {
    const { center, radius_m } = fence.geometry
    return { type: 'circle', center: { lat: center.lat, lon: center.lng }, radius: radius_m / 1000 }
  }
  return {
    type: 'polygon',
    path: fence.geometry.points.map(p => ({ lat: p.lat, lon: p.lng })),
  }
}

/**
 * Crea el espejo de una geocerca en Flespi. El `name` es NUESTRO uuid: es lo
 * que el calculator devuelve en el intervalo, y así el webhook resuelve la fila
 * sin depender del id numérico de Flespi.
 */
export async function createGeofence(ourId: string, fence: CreateGeofenceInput): Promise<number> {
  const result = await requestResult('/gw/geofences', {
    method: 'POST',
    body: JSON.stringify([{ name: ourId, geometry: toFlespiGeometry(fence) }]),
  })
  const id = result[0]?.id
  if (typeof id !== 'number') throw new FlespiError('Flespi no devolvió el id de la geocerca', 502)
  return id
}

export async function deleteGeofence(flespiGeofenceId: number): Promise<void> {
  await requestResult(`/gw/geofences/${flespiGeofenceId}`, { method: 'DELETE' })
}

/**
 * Asigna el dispositivo a un calculator de alertas compartido (idempotente).
 * Sin la env var la alerta queda configurada pero nunca dispara: se avisa en
 * logs en vez de fallar, igual que getTrips con FLESPI_TRIPS_CALC_ID.
 */
async function attachDeviceToCalc(envVar: string, deviceId: number): Promise<void> {
  const calcId = process.env[envVar]
  if (!calcId) {
    console.warn(`[flespi] ${envVar} no configurado — la alerta no se disparará`)
    return
  }
  await requestResult(`/gw/calcs/${calcId}/devices/${deviceId}`, { method: 'POST' })
}

/**
 * Vincula la geocerca al dispositivo y el dispositivo al calculator de
 * geocercas. Flespi combina las geocercas del dispositivo con las del
 * calculator al procesar sus mensajes, así que un único calculator compartido
 * sirve para todos los clientes.
 */
export async function attachGeofenceToDevice(
  flespiGeofenceId: number,
  deviceId: number
): Promise<void> {
  await requestResult(`/gw/devices/${deviceId}/geofences/${flespiGeofenceId}`, { method: 'POST' })
  await attachDeviceToCalc('FLESPI_GEOFENCE_CALC_ID', deviceId)
}

/**
 * Asigna el dispositivo al calculator de ignición. Se llama cuando alguien
 * activa la alerta de encendido/apagado: los equipos que nadie quiere vigilar
 * no generan intervalos ni llamadas al webhook.
 */
export async function attachDeviceToIgnitionCalc(deviceId: number): Promise<void> {
  await attachDeviceToCalc('FLESPI_IGNITION_CALC_ID', deviceId)
}
