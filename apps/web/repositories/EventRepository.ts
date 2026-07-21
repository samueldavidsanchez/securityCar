import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleEvent, VehicleEventType } from '@securitycar/shared'

export interface RecordEventInput {
  vehicle_id: string
  event_type: VehicleEventType
  occurred_at: string
  payload: Record<string, unknown> | null
  flespi_event_id: string | null
}

export interface IEventRepository {
  findVehicleIdByFlespiDevice(flespiDeviceId: number): Promise<string | null>
  record(input: RecordEventInput): Promise<void>
  listByVehicle(vehicleId: string, limit?: number): Promise<VehicleEvent[]>
}

export class SupabaseEventRepository implements IEventRepository {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Resuelve el vehículo a partir del id de dispositivo de Flespi. Lo usa el
   * webhook, que llega sin usuario: requiere el service client, ya que `devices`
   * no es legible con la clave anónima salvo a través de un vehículo propio.
   */
  async findVehicleIdByFlespiDevice(flespiDeviceId: number): Promise<string | null> {
    const { data, error } = await this.db
      .from('devices')
      .select('vehicles(id)')
      .eq('flespi_device_id', flespiDeviceId)
      .maybeSingle<{ vehicles: { id: string } | { id: string }[] | null }>()
    if (error) throw error
    if (!data?.vehicles) return null
    const v = data.vehicles
    return Array.isArray(v) ? (v[0]?.id ?? null) : v.id
  }

  /**
   * Inserta un evento de negocio. `onConflict` sobre (vehicle_id,
   * flespi_event_id) hace la operación idempotente: Flespi puede reintentar el
   * webhook y no debe duplicarse la alerta.
   */
  async record(input: RecordEventInput): Promise<void> {
    const { error } = await this.db
      .from('vehicle_events')
      .upsert(input, { onConflict: 'vehicle_id,flespi_event_id', ignoreDuplicates: true })
    if (error) throw error
  }

  async listByVehicle(vehicleId: string, limit = 50): Promise<VehicleEvent[]> {
    const { data, error } = await this.db
      .from('vehicle_events')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('occurred_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as VehicleEvent[]
  }
}
