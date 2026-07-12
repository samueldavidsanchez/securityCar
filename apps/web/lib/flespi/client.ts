import 'server-only'

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

  return res.json() as Promise<T>
}

interface FlespiEnvelope<T> {
  result: T[]
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
  const res = await request<FlespiEnvelope<Record<string, unknown>>>(
    `/gw/devices/${deviceId}/messages?data=${data}`
  )
  return res.result[0] ?? null
}

/**
 * Fetch calculated trips for a device within a time window (unix seconds).
 */
export async function getTrips(
  deviceId: number,
  from: number,
  to: number
): Promise<Record<string, unknown>[]> {
  const data = encodeURIComponent(JSON.stringify({ from, to }))
  const res = await request<FlespiEnvelope<Record<string, unknown>>>(
    `/gw/devices/${deviceId}/messages?data=${data}`
  )
  return res.result
}

/**
 * Send a command to a device via the Flespi gateway.
 */
export async function sendCommand(
  deviceId: number,
  command: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await request<FlespiEnvelope<Record<string, unknown>>>(
    `/gw/devices/${deviceId}/commands`,
    {
      method: 'POST',
      body: JSON.stringify([command]),
    }
  )
  return res.result[0] ?? {}
}
