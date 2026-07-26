import 'server-only'
import { FlespiEnvelopeSchema } from '@securitycar/shared'

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
 * Send a command to a device via the Flespi gateway.
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
