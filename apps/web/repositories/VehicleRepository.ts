import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateVehicleInput, UpdateVehicleInput, Vehicle } from '@securitycar/shared'

export interface IVehicleRepository {
  findByOwner(userId: string): Promise<Vehicle[]>
  findById(id: string, userId: string): Promise<Vehicle | null>
  create(userId: string, input: CreateVehicleInput): Promise<Vehicle>
  update(id: string, userId: string, input: UpdateVehicleInput): Promise<Vehicle | null>
  remove(id: string, userId: string): Promise<void>
}

/**
 * Supabase-backed implementation. RLS scopes rows to the authenticated user,
 * but we filter by owner explicitly as defense-in-depth.
 *
 * To migrate off Supabase, implement IVehicleRepository against another
 * data source — business logic and route handlers stay unchanged.
 */
export class SupabaseVehicleRepository implements IVehicleRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByOwner(userId: string): Promise<Vehicle[]> {
    const { data, error } = await this.db
      .from('vehicles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data ?? []
  }

  async findById(id: string, userId: string): Promise<Vehicle | null> {
    const { data, error } = await this.db
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .eq('owner_id', userId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  async create(userId: string, input: CreateVehicleInput): Promise<Vehicle> {
    const { data, error } = await this.db
      .from('vehicles')
      .insert({ ...input, owner_id: userId })
      .select('*')
      .single()
    if (error) throw error
    return data
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
      .select('*')
      .maybeSingle()
    if (error) throw error
    return data
  }

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('vehicles')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId)
    if (error) throw error
  }
}
