import type { SupabaseClient } from '@supabase/supabase-js'
import type { Vehicle, VehicleRole } from '@securitycar/shared'
import { hasRole } from '@securitycar/shared'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'

export class VehicleNotFoundError extends Error {
  constructor() {
    super('Vehículo no encontrado')
    this.name = 'VehicleNotFoundError'
  }
}

export class InsufficientRoleError extends Error {
  constructor() {
    super('No tienes permisos suficientes sobre este vehículo')
    this.name = 'InsufficientRoleError'
  }
}

/**
 * Carga un vehículo al que el usuario tiene acceso y comprueba que su rol
 * alcanza el mínimo exigido.
 *
 * La visibilidad la aplica RLS (dueño o fila en `vehicle_users`); aquí solo se
 * verifica el nivel de rol. Un usuario sin acceso ninguno recibe 404 en vez de
 * 403: distinguirlos revelaría qué IDs de vehículo existen.
 *
 * Reglas: lectura de telemetría → 'viewer'; envío de comandos → 'driver';
 * modificar o borrar el vehículo y gestionar accesos → 'owner'.
 */
export async function loadAccessibleVehicle(
  supabase: SupabaseClient,
  vehicleId: string,
  requiredRole: VehicleRole = 'viewer'
): Promise<Vehicle> {
  const repo = new SupabaseVehicleRepository(supabase)
  const vehicle = await repo.findById(vehicleId)
  if (!vehicle) throw new VehicleNotFoundError()
  if (!vehicle.effective_role || !hasRole(vehicle.effective_role, requiredRole)) {
    throw new InsufficientRoleError()
  }
  return vehicle
}
