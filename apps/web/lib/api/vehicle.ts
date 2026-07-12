import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Vehicle } from '@securitycar/shared'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'

export class VehicleNotFoundError extends Error {
  constructor() {
    super('Vehículo no encontrado')
    this.name = 'VehicleNotFoundError'
  }
}

/**
 * Loads a vehicle owned by the user, or throws VehicleNotFoundError.
 * Uses the caller's authenticated Supabase client so RLS applies.
 */
export async function loadOwnedVehicle(
  supabase: SupabaseClient,
  user: User,
  vehicleId: string
): Promise<Vehicle> {
  const repo = new SupabaseVehicleRepository(supabase)
  const vehicle = await repo.findById(vehicleId, user.id)
  if (!vehicle) throw new VehicleNotFoundError()
  return vehicle
}
