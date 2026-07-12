import crypto from 'node:crypto'
import { NextResponse } from 'next/server'

/**
 * Flespi webhook receiver. No JWT — authenticity is verified via an HMAC
 * signature over the raw body using FLESPI_WEBHOOK_SECRET.
 *
 * Configure the shared secret in the Flespi webhook/calc plugin. Events are
 * used to trigger notifications; telemetry itself is never persisted.
 */
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.FLESPI_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-signature') ?? request.headers.get('x-hub-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ data: null, error: 'Firma inválida' }, { status: 401 })
  }

  let events: unknown
  try {
    events = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ data: null, error: 'Payload inválido' }, { status: 400 })
  }

  // TODO(phase-6): fan out events to notifications
  // (disconnected, movement, ignition, low battery) using the service client.
  console.log('[flespi-webhook]', Array.isArray(events) ? events.length : 1, 'event(s)')

  return NextResponse.json({ data: { received: true }, error: null })
}
