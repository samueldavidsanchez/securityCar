import type { SupabaseClient } from '@supabase/supabase-js'
import type { VehicleEvent, VehicleEventType } from '@securitycar/shared'

export interface RecordEventInput {
  vehicle_id: string
  event_type: VehicleEventType
  occurred_at: string
  payload: Record<string, unknown> | null
  flespi_event_id: string | null
}

type VehicleRef = { id: string; deleted_at: string | null }

export interface IEventRepository {
  findVehicleIdByFlespiDevice(flespiDeviceId: number): Promise<string | null>
  record(input: RecordEventInput): Promise<boolean>
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
      .select('vehicles(id, deleted_at)')
      .eq('flespi_device_id', flespiDeviceId)
      .maybeSingle<{ vehicles: VehicleRef | VehicleRef[] | null }>()
    if (error) throw error
    if (!data?.vehicles) return null
    // Un dispositivo puede tener vehículos soft-deleted (0005) además del
    // activo: el evento es solo del activo.
    const list = Array.isArray(data.vehicles) ? data.vehicles : [data.vehicles]
    return list.find(v => v.deleted_at === null)?.id ?? null
  }

  /**
   * Inserta un evento de negocio. `onConflict` sobre (vehicle_id,
   * flespi_event_id) hace la operación idempotente: Flespi puede reintentar el
   * webhook y no debe duplicarse la alerta. Devuelve false si ya existía, para
   * no reenviar el push en un reintento.
   */
  async record(input: RecordEventInput): Promise<boolean> {
    const { data, error } = await this.db
      .from('vehicle_events')
      .upsert(input, { onConflict: 'vehicle_id,flespi_event_id', ignoreDuplicates: true })
      .select('id')
    if (error) throw error
    return (data ?? []).length > 0
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
