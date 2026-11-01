import 'server-only'
import { z } from 'zod'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
/** Expo acepta hasta 100 mensajes por petición. */
const BATCH_SIZE = 100

const ExpoTicketsSchema = z.object({
  data: z.array(
    z.object({
      status: z.enum(['ok', 'error']),
      details: z.object({ error: z.string().optional() }).optional(),
    })
  ),
})

export interface PushMessage {
  title: string
  body: string
  /** Llega a la app al tocar la notificación (p. ej. para abrir Historial). */
  data?: Record<string, unknown>
}

/**
 * Envía la misma notificación a varios tokens de Expo. Devuelve los tokens que
 * Expo reporta como `DeviceNotRegistered` (app desinstalada o permiso
 * revocado) para que el llamador los borre.
 *
 * Nunca lanza: una alerta que no se pudo entregar no debe hacer fallar el
 * webhook (Flespi reintentaría y el evento ya está registrado).
 */
export async function sendPush(tokens: string[], message: PushMessage): Promise<string[]> {
  const dead: string[] = []
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE)
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(
          batch.map(to => ({ to, sound: 'default', priority: 'high', channelId: 'alerts', ...message }))
        ),
      })
      if (!res.ok) {
        console.error('[push] Expo respondió', res.status, await res.text().catch(() => ''))
        continue
      }
      const parsed = ExpoTicketsSchema.safeParse(await res.json())
      if (!parsed.success) continue
      // Los tickets vienen en el mismo orden que los mensajes enviados.
      parsed.data.data.forEach((ticket, idx) => {
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          dead.push(batch[idx])
        }
      })
    } catch (err) {
      console.error('[push] error enviando lote', err)
    }
  }
  return dead
}
