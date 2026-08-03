import type { DeviceStatus } from './vehicle'
import type { VehicleRole } from './sharing'

/** Fila devuelta por la función `admin_vehicles` — vehículo de CUALQUIER cliente. */
export interface AdminVehicleSummary {
  id: string
  owner_id: string
  owner_email: string
  alias: string
  plate: string | null
  make: string | null
  model: string | null
  year: number | null
  created_at: string
  deleted_at: string | null
  device_id: string
  imei: string | null
  flespi_device_id: number | null
  device_status: DeviceStatus | null
}

/** Fila devuelta por la función `admin_users`. */
export interface AdminUserSummary {
  id: string
  email: string
  display_name: string | null
  phone: string | null
  is_admin: boolean
  created_at: string
}

/** Fila devuelta por la función `admin_user_access`: vehículos a los que un usuario tiene acceso. */
export interface AdminUserAccessRow {
  vehicle_id: string
  alias: string
  role: VehicleRole
  granted_at: string
}
