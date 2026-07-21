import type { SupabaseClient } from '@supabase/supabase-js'
import type { ClaimVehicleInput, UpdateVehicleInput, Vehicle } from '@securitycar/shared'

/**
 * Columnas expuestas por la API. El ID de Flespi llega por join desde
 * `devices` — `vehicles` ya no lo almacena (ver migración 0002).
 * `effective_role` es un campo calculado en Postgres (ver migración 0003).
 */
const VEHICLE_SELECT =
  'id, owner_id, device_id, alias, plate, make, model, year, created_at, ' +
  'effective_role, device:devices(imei, flespi_device_id, status)'

export type ClaimOutcome =
  | { ok: true; vehicle: Vehicle }
  | { ok: false; reason: 'INVALID_CODE' | 'RATE_LIMITED' | 'UNAUTHORIZED' }

export interface IVehicleRepository {
  findAccessible(): Promise<Vehicle[]>
  findById(id: string): Promise<Vehicle | null>
  claim(input: ClaimVehicleInput): Promise<ClaimOutcome>
  update(id: string, userId: string, input: UpdateVehicleInput): Promise<Vehicle | null>
  remove(id: string, userId: string): Promise<void>
}

/**
 * Supabase-backed implementation.
 *
 * Las LECTURAS no filtran por usuario: desde 0003 el alcance lo decide RLS
 * (dueño o acceso compartido vía `vehicle_users`), y filtrar por owner_id aquí
 * ocultaría precisamente los vehículos compartidos. Las ESCRITURAS sí filtran
 * por dueño explícitamente, como defensa en profundidad sobre la política.
 *
 * To migrate off Supabase, implement IVehicleRepository against another
 * data source — business logic and route handlers stay unchanged.
 */
export class SupabaseVehicleRepository implements IVehicleRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findAccessible(): Promise<Vehicle[]> {
    const { data, error } = await this.db
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as Vehicle[]
  }

  async findById(id: string): Promise<Vehicle | null> {
    const { data, error } = await this.db
      .from('vehicles')
      .select(VEHICLE_SELECT)
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Vehicle) ?? null
  }

  /**
   * Reclama un dispositivo provisionado y crea su vehículo.
   *
   * Toda la lógica vive en la función `claim_device` de Postgres para que el
   * consumo del código y el alta del vehículo ocurran en una sola transacción:
   * dos peticiones simultáneas con el mismo código no pueden ganar ambas.
   * La función devuelve un código de resultado en vez de lanzar excepción,
   * porque un rollback borraría el intento registrado para el rate limit.
   */
  async claim(input: ClaimVehicleInput): Promise<ClaimOutcome> {
    const { data, error } = await this.db
      .rpc('claim_device', {
        p_claim_code: input.claim_code,
        p_alias: input.alias,
        p_plate: input.plate ?? null,
        p_make: input.make ?? null,
        p_model: input.model ?? null,
        p_year: input.year ?? null,
      })
      .single<{ result: string; vehicle_id: string | null }>()

    if (error) throw error

    if (data.result !== 'OK' || !data.vehicle_id) {
      const reason = data.result as 'INVALID_CODE' | 'RATE_LIMITED' | 'UNAUTHORIZED'
      return { ok: false, reason }
    }

    // Relectura para devolver la misma forma que el resto de endpoints
    // (la función solo devuelve el id del vehículo creado).
    const vehicle = await this.findById(data.vehicle_id)
    if (!vehicle) throw new Error('Vehículo reclamado pero no legible')
    return { ok: true, vehicle }
  }

  async update(
    id: string,
    userId: string,
    input: UpdateVehicleInput
  ): Promise<Vehicle | null> {
    const { data, error } = await this.db
      .from('vehicles')
      .update(input)
      .eq('id', id)
      .eq('owner_id', userId)
      .select(VEHICLE_SELECT)
      .maybeSingle()
    if (error) throw error
    return (data as unknown as Vehicle) ?? null
  }

  /**
   * Soft-delete: marca `deleted_at` en vez de borrar la fila, para preservar
   * la auditoría de comandos (ver migración 0005). El índice único parcial
   * sobre device_id libera el equipo para un vehículo futuro.
   */
  async remove(id: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('vehicles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('owner_id', userId)
      .is('deleted_at', null)
    if (error) throw error
  }
}
