import { z } from 'zod'
import { VehicleMetadataSchema } from './vehicle.schema'

/** El admin otorga acceso directamente, sin invitación — necesita el user_id. */
export const AdminGrantMemberSchema = z.object({
  user_id: z.uuid(),
  role: z.enum(['driver', 'viewer']),
})

/**
 * Alta de dispositivo desde el panel admin — misma validación de IMEI que
 * `scripts/provision-device.mjs`. `flespi_device_id` es opcional: si se omite,
 * la ruta busca el device en Flespi por IMEI (igual que el script con
 * --flespi-id ausente).
 */
export const AdminProvisionDeviceSchema = z.object({
  imei: z.string().regex(/^\d{15}$/, 'IMEI debe ser de 15 dígitos'),
  sim_iccid: z.string().max(30).nullable().optional(),
  flespi_device_id: z.number().int().positive().optional(),
})

export const AdminUpdateDeviceSchema = z.object({
  status: z.enum(['provisioned', 'active', 'retired']).optional(),
  sim_iccid: z.string().max(30).nullable().optional(),
  regenerate_claim_code: z.boolean().optional(),
})

/**
 * Asignación directa: el admin crea el vehículo a nombre de `owner_id` sin
 * que el cliente tenga que canjear el claim_code él mismo (instalación en
 * concesionario, alta B2B, cliente sin acceso a la app todavía). El
 * autoservicio normal (canjear el código desde la propia cuenta) sigue
 * existiendo — esto es una vía adicional, no un reemplazo.
 */
export const AdminAssignDeviceSchema = VehicleMetadataSchema.extend({
  owner_id: z.uuid(),
})

export type AdminGrantMemberInput = z.infer<typeof AdminGrantMemberSchema>
export type AdminProvisionDeviceInput = z.infer<typeof AdminProvisionDeviceSchema>
export type AdminUpdateDeviceInput = z.infer<typeof AdminUpdateDeviceSchema>
export type AdminAssignDeviceInput = z.infer<typeof AdminAssignDeviceSchema>
