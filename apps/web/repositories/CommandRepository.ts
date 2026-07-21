import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommandLog, CommandType } from '@securitycar/shared'

export interface CreateCommandLog {
  vehicle_id: string
  user_id: string
  command_type: CommandType
  payload: Record<string, unknown> | null
}

export interface ICommandRepository {
  logPending(input: CreateCommandLog): Promise<CommandLog>
  markResult(
    id: string,
    status: 'sent' | 'failed',
    flespiResponse: Record<string, unknown> | null,
    flespiCommandId?: number | null
  ): Promise<void>
  confirmByFlespiCommandId(
    flespiCommandId: number,
    ack: Record<string, unknown>
  ): Promise<boolean>
  countRecentByUser(userId: string, sinceIso: string): Promise<number>
  listByVehicle(vehicleId: string, limit?: number): Promise<CommandLog[]>
}

export class SupabaseCommandRepository implements ICommandRepository {
  constructor(private readonly db: SupabaseClient) {}

  async logPending(input: CreateCommandLog): Promise<CommandLog> {
    const { data, error } = await this.db
      .from('command_logs')
      .insert({ ...input, status: 'pending' })
      .select('*')
      .single()
    if (error) throw error
    return data
  }

  async markResult(
    id: string,
    status: 'sent' | 'failed',
    flespiResponse: Record<string, unknown> | null,
    flespiCommandId?: number | null
  ): Promise<void> {
    const patch: Record<string, unknown> = { status, flespi_response: flespiResponse }
    if (flespiCommandId != null) patch.flespi_command_id = flespiCommandId
    const { error } = await this.db.from('command_logs').update(patch).eq('id', id)
    if (error) throw error
  }

  /**
   * Cierra el ciclo del comando cuando el dispositivo confirma la ejecución.
   * Lo invoca el webhook con el service client (bypassa RLS: no hay usuario en
   * ese contexto). Solo confirma filas que ya estaban en 'sent' — un ACK sobre
   * un comando fallido o inexistente se ignora. Devuelve si casó alguna fila.
   */
  async confirmByFlespiCommandId(
    flespiCommandId: number,
    ack: Record<string, unknown>
  ): Promise<boolean> {
    const { data, error } = await this.db
      .from('command_logs')
      .update({ status: 'confirmed', flespi_response: ack })
      .eq('flespi_command_id', flespiCommandId)
      .eq('status', 'sent')
      .select('id')
    if (error) throw error
    return (data?.length ?? 0) > 0
  }

  /**
   * Comandos que este usuario ha registrado desde `sinceIso`. Base del
   * rate-limit de envío. Se filtra por user_id explícitamente porque un
   * propietario ve por RLS también los comandos de otros, y no deben contar
   * contra su propio límite.
   */
  async countRecentByUser(userId: string, sinceIso: string): Promise<number> {
    const { count, error } = await this.db
      .from('command_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sinceIso)
    if (error) throw error
    return count ?? 0
  }

  /**
   * El alcance lo decide RLS (migración 0003): el propietario del vehículo ve
   * todos los comandos, incluidos los de otros usuarios con acceso; el resto
   * solo los suyos. Filtrar por user_id aquí le ocultaría al dueño quién ha
   * bloqueado el motor de su vehículo.
   */
  async listByVehicle(vehicleId: string, limit = 20): Promise<CommandLog[]> {
    const { data, error } = await this.db
      .from('command_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  }
}
