import { z } from 'zod'

/** Alfabeto del claim code: sin 0/O/1/I/L para evitar errores al dictarlo. */
const CLAIM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const CLAIM_CODE_LENGTH = 8
const CLAIM_CODE_RE = new RegExp(`^[${CLAIM_CODE_ALPHABET}]{${CLAIM_CODE_LENGTH}}$`)

export const VehicleMetadataSchema = z.object({
  alias: z.string().min(1).max(50),
  plate: z.string().max(20).nullable().optional(),
  make: z.string().max(50).nullable().optional(),
  model: z.string().max(50).nullable().optional(),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1).nullable().optional(),
})

/**
 * Alta de vehículo. El cliente nunca envía un ID de Flespi: presenta el código
 * de activación entregado con el equipo y el servidor resuelve el dispositivo.
 * Se normaliza aquí para aceptar "ab3d-9xkf" igual que "AB3D9XKF".
 */
export const ClaimVehicleSchema = VehicleMetadataSchema.extend({
  claim_code: z
    .string()
    .transform(s => s.replace(/[^A-Za-z0-9]/g, '').toUpperCase())
    .refine(s => CLAIM_CODE_RE.test(s), 'Código de activación inválido'),
})

export const UpdateVehicleSchema = VehicleMetadataSchema.partial()

export type ClaimVehicleInput = z.infer<typeof ClaimVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>

/** Formatea un código para mostrarlo: AB3D9XKF → AB3D-9XKF */
export function formatClaimCode(code: string): string {
  const clean = code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  return clean.length === CLAIM_CODE_LENGTH ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

export { CLAIM_CODE_ALPHABET, CLAIM_CODE_LENGTH }
