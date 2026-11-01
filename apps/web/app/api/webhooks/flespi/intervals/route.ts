import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { FlespiIntervalWebhookSchema, type AlertEventType } from '@securitycar/shared'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPush } from '@/lib/push/send'
import { SupabaseEventRepository } from '@/repositories/EventRepository'
import { SupabaseGeofenceRepository } from '@/repositories/GeofenceRepository'
import { SupabasePushTokenRepository } from '@/repositories/PushTokenRepository'

/**
 * Receptor del webhook de plataforma de Flespi para los calculators de alertas.
 *
 * Flespi publica en `flespi/interval/gw/calcs/{calc}/devices/{device}/{event}`
 * y el webhook (creado por `scripts/setup-flespi-alerts.mjs`) reenvía aquí cada
 * evento. Un intervalo `activated` = empezó el estado, `deactivated` = terminó.
 * Qué estado es depende del calculator (`calc_id`):
 *   - FLESPI_GEOFENCE_CALC_ID → dentro de una geocerca (entró / salió). El
 *     counter `geofence_name` es el NOMBRE de la geocerca en Flespi = nuestro
 *     uuid (ver `createGeofence`).
 *   - FLESPI_IGNITION_CALC_ID → motor encendido (se encendió / se apagó).
 *
 * Detectar la TRANSICIÓN en Flespi es lo que evita mandar un push por cada
 * mensaje de telemetría con la ignición activa.
 *
 * Los webhooks de plataforma no firman el cuerpo (a diferencia del stream de
 * /api/webhooks/flespi), así que se autentica con un token secreto en un
 * header, comparado en tiempo constante.
 */
function verifyToken(header: string | null): boolean {
  const secret = process.env.FLESPI_ALERTS_WEBHOOK_TOKEN
  if (!secret || !header) return false
  const a = Buffer.from(secret)
  const b = Buffer.from(header)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ignored = () => NextResponse.json({ data: { recorded: false }, error: null })

export async function POST(request: Request) {
  if (!verifyToken(request.headers.get('x-webhook-token'))) {
    return NextResponse.json({ data: null, error: 'No autorizado' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = FlespiIntervalWebhookSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: 'Formato inesperado' }, { status: 400 })
  }

  const { event, device_id, calc_id, payload } = parsed.data
  // created/updated/deleted del intervalo llegan por el mismo topic: 200 para
  // que Flespi no los reintente.
  if ((event !== 'activated' && event !== 'deactivated') || !payload) return ignored()
  const started = event === 'activated'

  let kind: 'geofence' | 'ignition'
  if (String(calc_id) === process.env.FLESPI_GEOFENCE_CALC_ID) kind = 'geofence'
  else if (String(calc_id) === process.env.FLESPI_IGNITION_CALC_ID) kind = 'ignition'
  else return ignored()

  try {
    const db = createServiceClient()
    const events = new SupabaseEventRepository(db)
    const vehicleId = await events.findVehicleIdByFlespiDevice(device_id)
    if (!vehicleId) return ignored() // dispositivo sin vehículo activo

    let eventType: AlertEventType
    let eventPayload: Record<string, unknown> | null = null
    let wantsAlert = true
    let what: string

    if (kind === 'geofence') {
      // `geofence_name` es el counter que agrega el setup; `geofence` por si
      // Flespi ya lo expone por el selector.
      const fenceName = payload['geofence_name'] ?? payload['geofence']
      // Geocerca creada a mano en el panel de Flespi, no por la app.
      if (typeof fenceName !== 'string' || !UUID_RE.test(fenceName)) return ignored()
      const fence = await new SupabaseGeofenceRepository(db).findAlertTarget(fenceName)
      // La geocerca debe pertenecer al vehículo ACTIVO de ese equipo: tras un
      // soft-delete + nuevo claim, las geocercas viejas no deben avisar al nuevo dueño.
      if (!fence || fence.vehicle_id !== vehicleId) return ignored()
      eventType = started ? 'geofence_in' : 'geofence_out'
      eventPayload = { geofence_id: fence.id, geofence_name: fence.name }
      wantsAlert = started ? fence.alert_on_enter : fence.alert_on_exit
      what = `${started ? 'entró a' : 'salió de'} ${fence.name}`
    } else {
      eventType = started ? 'ignition_on' : 'ignition_off'
      what = started ? 'se encendió' : 'se apagó'
    }

    // begin = inicio del estado, end = fin. Unix seconds.
    const ts = started ? payload['begin'] : payload['end']
    const occurredAt = typeof ts === 'number' ? new Date(ts * 1000) : new Date()
    const intervalId = payload['id']
    const isNew = await events.record({
      vehicle_id: vehicleId,
      event_type: eventType,
      occurred_at: occurredAt.toISOString(),
      payload: eventPayload,
      // Idempotencia ante reintentos: el mismo intervalo + evento no se duplica
      // (ni se reenvía el push).
      flespi_event_id:
        typeof intervalId === 'number' || typeof intervalId === 'string'
          ? `${kind}:${calc_id}:${intervalId}:${event}`
          : null,
    })

    if (isNew && wantsAlert) {
      const tokens = new SupabasePushTokenRepository(db)
      const recipients = await tokens.findRecipientTokens(vehicleId, eventType)
      if (recipients.length > 0) {
        const { data: vehicle } = await db
          .from('vehicles')
          .select('alias')
          .eq('id', vehicleId)
          .maybeSingle<{ alias: string }>()
        const dead = await sendPush(recipients, {
          title: `${vehicle?.alias ?? 'Tu vehículo'} ${what}`,
          body: occurredAt.toLocaleTimeString('es-CL', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Santiago',
          }),
          data: { type: eventType, vehicle_id: vehicleId },
        })
        await tokens.removeTokens(dead)
      }
    }

    return NextResponse.json({ data: { recorded: isNew }, error: null })
  } catch (err) {
    console.error('[flespi-intervals-webhook]', err)
    return NextResponse.json({ data: null, error: 'Error interno' }, { status: 500 })
  }
}
