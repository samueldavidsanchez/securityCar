import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateGeofenceInput, Geofence, UpdateGeofenceInput } from '@securitycar/shared'

const GEOFENCE_SELECT =
  'id, vehicle_id, name, shape, geometry, alert_on_enter, alert_on_exit, created_at'

/** Fila mínima que necesita el webhook para decidir si avisa. */
export interface GeofenceAlertTarget {
  id: string
  vehicle_id: string
  name: string
  alert_on_enter: boolean
  alert_on_exit: boolean
}

export interface IGeofenceRepository {
  listByVehicle(vehicleId: string): Promise<Geofence[]>
  countByVehicle(vehicleId: string): Promise<number>
  findFlespiId(id: string, vehicleId: string): Promise<number | null>
  create(
    id: string,
    vehicleId: string,
    userId: string,
    input: CreateGeofenceInput,
    flespiGeofenceId: number
  ): Promise<Geofence>
  update(id: string, vehicleId: string, input: UpdateGeofenceInput): Promise<Geofence | null>
  remove(id: string, vehicleId: string): Promise<void>
  findAlertTarget(id: string): Promise<GeofenceAlertTarget | null>
}

/**
 * Las lecturas y escrituras de la app pasan por RLS (`geofences read/manage`,
 * migración 0009): viewer lee, driver/owner gestiona. `findAlertTarget` lo usa
 * el webhook con el service client.
 */
export class SupabaseGeofenceRepository implements IGeofenceRepository {
  constructor(private readonly db: SupabaseClient) {}

  async listByVehicle(vehicleId: string): Promise<Geofence[]> {
    const { data, error } = await this.db
      .from('geofences')
      .select(GEOFENCE_SELECT)
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as Geofence[]
  }

  async countByVehicle(vehicleId: string): Promise<number> {
    const { count, error } = await this.db
      .from('geofences')
      .select('id', { count: 'exact', head: true })
      .eq('vehicle_id', vehicleId)
    if (error) throw error
    return count ?? 0
  }

  async findFlespiId(id: string, vehicleId: string): Promise<number | null> {
    const { data, error } = await this.db
      .from('geofences')
      .select('flespi_geofence_id')
      .eq('id', id)
      .eq('vehicle_id', vehicleId)
      .maybeSingle<{ flespi_geofence_id: number | null }>()
    if (error) throw error
    return data?.flespi_geofence_id ?? null
  }

  async create(
    id: string,
    vehicleId: string,
    userId: string,
    input: CreateGeofenceInput,
    flespiGeofenceId: number
  ): Promise<Geofence> {
    const { data, error } = await this.db
      .from('geofences')
      .insert({
        id,
        vehicle_id: vehicleId,
        name: input.name,
        shape: input.shape,
        geometry: input.geometry,
        alert_on_enter: input.alert_on_enter,
        alert_on_exit: input.alert_on_exit,
        flespi_geofence_id: flespiGeofenceId,
        created_by: userId,
      })
      .select(GEOFENCE_SELECT)
      .single()
    if (error) throw error
    return data as Geofence
  }

  async update(id: string, vehicleId: string, input: UpdateGeofenceInput): Promise<Geofence | null> {
    const { data, error } = await this.db
      .from('geofences')
      .update(input)
      .eq('id', id)
      .eq('vehicle_id', vehicleId)
      .select(GEOFENCE_SELECT)
      .maybeSingle()
    if (error) throw error
    return (data as Geofence) ?? null
  }

  async remove(id: string, vehicleId: string): Promise<void> {
    const { error } = await this.db
      .from('geofences')
      .delete()
      .eq('id', id)
      .eq('vehicle_id', vehicleId)
    if (error) throw error
  }

  async findAlertTarget(id: string): Promise<GeofenceAlertTarget | null> {
    const { data, error } = await this.db
      .from('geofences')
      .select('id, vehicle_id, name, alert_on_enter, alert_on_exit')
      .eq('id', id)
      .maybeSingle<GeofenceAlertTarget>()
    if (error) throw error
    return data ?? null
  }
}
