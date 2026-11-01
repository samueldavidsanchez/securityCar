import { z } from 'zod'

/**
 * Validadores de datos que vienen de Flespi. Son deliberadamente laxos por
 * campo: los nombres exactos dependen del protocolo del dispositivo y de cómo
 * esté configurado el calculator/webhook. Lo que se valida con firmeza es la
 * ESTRUCTURA (que sea el sobre esperado y una lista de objetos); la extracción
 * de cada campo se hace luego de forma defensiva en los transforms.
 */

const RawRecord = z.record(z.string(), z.unknown())

/** Respuesta de los endpoints REST de Flespi: `{ result: [...] }`. */
export const FlespiEnvelopeSchema = z.object({
  result: z.array(RawRecord),
})

/**
 * Cuerpo del webhook. Flespi puede enviar un único objeto o una lista; se
 * normaliza a lista en el transform. `passthrough` implícito de RawRecord: no
 * se descarta ningún campo.
 */
export const FlespiWebhookSchema = z.union([RawRecord, z.array(RawRecord)])

/**
 * Cuerpo del webhook de plataforma de los calculators de alertas (geocercas,
 * encendido). Lo arma el body template del webhook de Flespi (ver
 * `scripts/setup-flespi-alerts.mjs`) a partir del topic
 * `flespi/interval/gw/calcs/{calc}/devices/{device}/{event}`: el intervalo
 * completo va en `payload`. Solo interesan activated/deactivated;
 * created/updated/deleted llegan por el mismo topic y se ignoran.
 */
export const FlespiIntervalWebhookSchema = z.object({
  event: z.string(),
  device_id: z.number().int(),
  calc_id: z.number().int(),
  payload: RawRecord.nullable(),
})

export type FlespiRawRecord = z.infer<typeof RawRecord>
export type FlespiIntervalWebhook = z.infer<typeof FlespiIntervalWebhookSchema>
