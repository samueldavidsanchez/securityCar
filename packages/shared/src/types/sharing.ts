/** Roles sobre un vehículo, de mayor a menor privilegio. */
export type VehicleRole = 'owner' | 'driver' | 'viewer'

/** Solo se puede invitar con estos roles: la propiedad no se transfiere. */
export type InvitableRole = Exclude<VehicleRole, 'owner'>

export const ROLE_RANK: Record<VehicleRole, number> = {
  viewer: 1,
  driver: 2,
  owner: 3,
}

export function hasRole(actual: VehicleRole, required: VehicleRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required]
}

export const ROLE_LABEL: Record<VehicleRole, string> = {
  owner: 'Propietario',
  driver: 'Conductor',
  viewer: 'Solo lectura',
}

/** Usuario con acceso concedido. Lo devuelve la función `vehicle_members`. */
export interface VehicleMember {
  user_id: string
  email: string
  display_name: string | null
  role: VehicleRole
  granted_at: string
}

export interface Invitation {
  id: string
  vehicle_id: string
  invited_by: string
  email: string | null
  role: InvitableRole
  token: string
  expires_at: string
  accepted_by: string | null
  accepted_at: string | null
  created_at: string
}
