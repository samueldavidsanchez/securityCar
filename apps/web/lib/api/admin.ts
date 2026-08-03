import type { SupabaseClient } from '@supabase/supabase-js'
import type { Vehicle } from '@securitycar/shared'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'
import { VehicleNotFoundError } from '@/lib/api/vehicle'

export class AdminRequiredError extends Error {
  constructor() {
    super('Requiere permisos de administrador')
    this.name = 'AdminRequiredError'
  }
}

/**
 * Verifica que el usuario autenticado sea staff de plataforma. El límite real
 * lo aplican las políticas RLS `... admin ...` y las funciones `admin_*` de la
 * migración 0006 — esto es una comprobación en la ruta para devolver un 403
 * temprano y consistente, no el único punto de control.
 */
export async function requireAdmin(supabase: SupabaseClient): Promise<void> {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) throw error
  if (!data) throw new AdminRequiredError()
}

/**
 * Carga un vehículo para una acción admin (p.ej. enviar un comando) sin pasar
 * por `effective_role`: la autorización ya la dio `requireAdmin`, y
 * `user_vehicle_role` se dejó sin tocar a propósito (migración 0006) para que
 * una cuenta admin no vea de repente vehículos ajenos en la app de
 * consumidor — así que `effective_role` seguiría siendo null aquí. La
 * visibilidad de la fila la da la policy "vehicles admin read".
 */
export async function loadVehicleForAdmin(
  supabase: SupabaseClient,
  vehicleId: string
): Promise<Vehicle> {
  const repo = new SupabaseVehicleRepository(supabase)
  const vehicle = await repo.findById(vehicleId)
  if (!vehicle) throw new VehicleNotFoundError()
  return vehicle
}
