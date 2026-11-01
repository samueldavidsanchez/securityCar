import { z } from 'zod'

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

const GeofenceBaseSchema = z.object({
  name: z.string().trim().min(1, 'Ponle un nombre a la zona').max(60),
  alert_on_enter: z.boolean().default(true),
  alert_on_exit: z.boolean().default(true),
})

/**
 * Radio entre 50 m y 50 km: por debajo de 50 m el error del GPS genera
 * entradas/salidas falsas; por encima deja de ser una "zona" útil.
 */
export const CircleGeofenceSchema = GeofenceBaseSchema.extend({
  shape: z.literal('circle'),
  geometry: z.object({
    center: LatLngSchema,
    radius_m: z.number().min(50, 'El radio mínimo es 50 m').max(50_000, 'El radio máximo es 50 km'),
  }),
})

export const PolygonGeofenceSchema = GeofenceBaseSchema.extend({
  shape: z.literal('polygon'),
  geometry: z.object({
    points: z.array(LatLngSchema).min(3, 'El polígono necesita al menos 3 puntos').max(100),
  }),
})

export const CreateGeofenceSchema = z.discriminatedUnion('shape', [
  CircleGeofenceSchema,
  PolygonGeofenceSchema,
])

/**
 * Edición: nombre y alertas. Cambiar la forma se hace borrando y creando —
 * evita reconciliar un cambio de geometría a medias con Flespi.
 */
export const UpdateGeofenceSchema = z
  .object({
    name: GeofenceBaseSchema.shape.name,
    alert_on_enter: z.boolean(),
    alert_on_exit: z.boolean(),
  })
  .partial()

export const RegisterPushTokenSchema = z.object({
  token: z.string().min(10).max(255),
  platform: z.enum(['android', 'ios']),
})

/** Cambio parcial de preferencias: solo se envían los switches que se tocaron. */
export const UpdateNotificationPreferencesSchema = z
  .object({
    ignition_on: z.boolean(),
    ignition_off: z.boolean(),
    geofence_in: z.boolean(),
    geofence_out: z.boolean(),
  })
  .partial()
  .refine(v => Object.keys(v).length > 0, 'Sin cambios')

export type CreateGeofenceInput = z.infer<typeof CreateGeofenceSchema>
export type UpdateGeofenceInput = z.infer<typeof UpdateGeofenceSchema>
export type RegisterPushTokenInput = z.infer<typeof RegisterPushTokenSchema>
export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>
