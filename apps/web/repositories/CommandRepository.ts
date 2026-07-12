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
    flespiResponse: Record<string, unknown> | null
  ): Promise<void>
  listByVehicle(vehicleId: string, userId: string, limit?: number): Promise<CommandLog[]>
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
    flespiResponse: Record<string, unknown> | null
  ): Promise<void> {
    const { error } = await this.db
      .from('command_logs')
      .update({ status, flespi_response: flespiResponse })
      .eq('id', id)
    if (error) throw error
  }

  async listByVehicle(
    vehicleId: string,
    userId: string,
    limit = 20
  ): Promise<CommandLog[]> {
    const { data, error } = await this.db
      .from('command_logs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  }
}
