import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AdminAssignDeviceInput,
  AdminUserAccessRow,
  AdminUserSummary,
  AdminVehicleSummary,
  Device,
} from '@securitycar/shared'

export interface ProvisionDeviceInput {
  imei: string
  flespi_device_id: number
  sim_iccid?: string | null
  claim_code: string
}

export interface UpdateDeviceInput {
  status?: Device['status']
  sim_iccid?: string | null
  claim_code?: string | null
}

export type AssignDeviceOutcome =
  | { ok: true; vehicleId: string }
  | { ok: false; reason: 'UNAUTHORIZED' | 'USER_NOT_FOUND' | 'DEVICE_UNAVAILABLE' }

export interface IAdminRepository {
  listVehicles(query?: string): Promise<AdminVehicleSummary[]>
  getVehicle(id: string): Promise<AdminVehicleSummary | null>
  listUsers(query?: string): Promise<AdminUserSummary[]>
  getUserAccess(userId: string): Promise<AdminUserAccessRow[]>
  listDevices(query?: string): Promise<Device[]>
  getDevice(id: string): Promise<Device | null>
  provisionDevice(input: ProvisionDeviceInput): Promise<Device>
  updateDevice(id: string, patch: UpdateDeviceInput): Promise<Device>
  assignDevice(deviceId: string, input: AdminAssignDeviceInput): Promise<AssignDeviceOutcome>
  removeVehicle(id: string): Promise<void>
}

/**
 * Lecturas/escrituras de plataforma para el panel admin. Los listados van por
 * RPC (`admin_vehicles`/`admin_users`/`admin_user_access`, migración 0006)
 * porque unen contra `auth.users`, inaccesible desde PostgREST directamente
 * — mismo motivo que ya resolvió `vehicle_members` para el dueño de un
 * vehículo. `devices` sí se lee/escribe por tabla normal: las policies
 * "devices admin ..." (0006) ya cubren el acceso vía RLS.
 */
export class SupabaseAdminRepository implements IAdminRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listVehicles(query?: string): Promise<AdminVehicleSummary[]> {
    const { data, error } = await this.db.rpc('admin_vehicles', { p_query: query ?? null })
    if (error) throw error
    return (data ?? []) as AdminVehicleSummary[]
  }

  async getVehicle(id: string): Promise<AdminVehicleSummary | null> {
    const { data, error } = await this.db
      .rpc('admin_vehicles', { p_query: null, p_vehicle_id: id })
      .maybeSingle()
    if (error) throw error
    return (data as AdminVehicleSummary) ?? null
  }

  async listUsers(query?: string): Promise<AdminUserSummary[]> {
    const { data, error } = await this.db.rpc('admin_users', { p_query: query ?? null })
    if (error) throw error
    return (data ?? []) as AdminUserSummary[]
  }

  async getUserAccess(userId: string): Promise<AdminUserAccessRow[]> {
    const { data, error } = await this.db.rpc('admin_user_access', { p_user: userId })
    if (error) throw error
    return (data ?? []) as AdminUserAccessRow[]
  }

  async listDevices(query?: string): Promise<Device[]> {
    let req = this.db.from('devices').select('*').order('created_at', { ascending: false })
    if (query) {
      req = req.or(`imei.ilike.%${query}%,sim_iccid.ilike.%${query}%,claim_code.ilike.%${query}%`)
    }
    const { data, error } = await req
    if (error) throw error
    return (data ?? []) as Device[]
  }

  async getDevice(id: string): Promise<Device | null> {
    const { data, error } = await this.db.from('devices').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return (data as Device) ?? null
  }

  async provisionDevice(input: ProvisionDeviceInput): Promise<Device> {
    const { data, error } = await this.db
      .from('devices')
      .insert({ ...input, status: 'provisioned' })
      .select('*')
      .single()
    if (error) throw error
    return data as Device
  }

  async updateDevice(id: string, patch: UpdateDeviceInput): Promise<Device> {
    const { data, error } = await this.db
      .from('devices')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return data as Device
  }

  /**
   * Asignación directa: crea el vehículo a nombre de `input.owner_id` sin
   * pasar por el canje de claim_code del propio cliente. Vía RPC porque
   * consume el device atómicamente (mismo patrón que `claim`, migración
   * 0007) — dos asignaciones simultáneas sobre el mismo dispositivo no
   * pueden ganar ambas.
   */
  async assignDevice(deviceId: string, input: AdminAssignDeviceInput): Promise<AssignDeviceOutcome> {
    const { data, error } = await this.db
      .rpc('admin_assign_device', {
        p_device_id: deviceId,
        p_owner_id: input.owner_id,
        p_alias: input.alias,
        p_plate: input.plate ?? null,
        p_make: input.make ?? null,
        p_model: input.model ?? null,
        p_year: input.year ?? null,
      })
      .single<{ result: string; vehicle_id: string | null }>()
    if (error) throw error

    if (data.result !== 'OK' || !data.vehicle_id) {
      return { ok: false, reason: data.result as 'UNAUTHORIZED' | 'USER_NOT_FOUND' | 'DEVICE_UNAVAILABLE' }
    }
    return { ok: true, vehicleId: data.vehicle_id }
  }

  /**
   * Baja de vehículo, p.ej. al dar de baja al usuario dueño. Soft-delete
   * (mismo patrón que `VehicleRepository.remove`, migración 0005): marca
   * `deleted_at` en vez de borrar la fila, para que `command_logs` sobreviva
   * como auditoría. Habilitado por la policy "vehicles admin update" (0008).
   */
  async removeVehicle(id: string): Promise<void> {
    const { error } = await this.db
      .from('vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
    if (error) throw error
  }
}
