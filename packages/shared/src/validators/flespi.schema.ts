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

export type FlespiRawRecord = z.infer<typeof RawRecord>
