import { z } from 'zod'

export const CreateVehicleSchema = z.object({
  flespi_device_id: z.number().int().positive(),
  alias: z.string().min(1).max(50),
  plate: z.string().max(20).nullable().optional(),
  make: z.string().max(50).nullable().optional(),
  model: z.string().max(50).nullable().optional(),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1).nullable().optional(),
})

export const UpdateVehicleSchema = CreateVehicleSchema.partial().omit({
  flespi_device_id: true,
})

export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>
