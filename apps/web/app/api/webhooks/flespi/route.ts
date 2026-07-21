import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { FlespiWebhookSchema } from '@securitycar/shared'
import { parseWebhookRecord } from '@/lib/flespi/transforms'
import { createServiceClient } from '@/lib/supabase/server'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'
import { SupabaseEventRepository } from '@/repositories/EventRepository'

/**
 * Receptor del webhook de Flespi. Sin JWT: la autenticidad se verifica con una
 * firma HMAC sobre el cuerpo crudo usando FLESPI_WEBHOOK_SECRET.
 *
 * Hace dos cosas y solo dos: confirma comandos (ACK del dispositivo → estado
 * 'confirmed') y registra eventos de negocio ya tipados. La telemetría cruda se
 * ignora — no se persiste (regla de "no almacenar telemetría").
 *
 * Corre con el service client porque no hay usuario en este contexto; es el
 * único lugar legítimo para saltarse RLS.
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

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ data: null, error: 'Payload inválido' }, { status: 400 })
  }

  const parsed = FlespiWebhookSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Formato inesperado' }, { status: 400 })
  }
  const records = Array.isArray(parsed.data) ? parsed.data : [parsed.data]

  const db = createServiceClient()
  const commands = new SupabaseCommandRepository(db)
  const events = new SupabaseEventRepository(db)

  let confirmed = 0
  let recorded = 0

  for (const raw of records) {
    try {
      const rec = parseWebhookRecord(raw)
      if (rec.kind === 'command_ack') {
        if (await commands.confirmByFlespiCommandId(rec.flespiCommandId, raw)) confirmed++
      } else if (rec.kind === 'event') {
        const vehicleId = await events.findVehicleIdByFlespiDevice(rec.flespiDeviceId)
        if (!vehicleId) continue // dispositivo aún no reclamado
        await events.record({
          vehicle_id: vehicleId,
          event_type: rec.eventType,
          occurred_at: rec.occurredAt,
          payload: rec.payload,
          flespi_event_id: rec.flespiEventId,
        })
        recorded++
      }
    } catch (err) {
      // Un registro corrupto no debe tumbar el lote entero ni provocar que
      // Flespi reintente indefinidamente. Se registra y se sigue.
      console.error('[flespi-webhook] error procesando registro', err)
    }
  }

  return NextResponse.json({ data: { confirmed, recorded }, error: null })
}
