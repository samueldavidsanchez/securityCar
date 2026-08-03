import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreateInvitationInput,
  InvitableRole,
  Invitation,
  VehicleMember,
} from '@securitycar/shared'

export type AcceptOutcome =
  | { ok: true; vehicleId: string }
  | { ok: false; reason: 'INVALID_TOKEN' | 'UNAUTHORIZED' | 'ALREADY_OWNER' }

export interface ISharingRepository {
  listMembers(vehicleId: string): Promise<VehicleMember[]>
  grantMember(vehicleId: string, userId: string, role: InvitableRole): Promise<void>
  updateMemberRole(vehicleId: string, userId: string, role: InvitableRole): Promise<void>
  revokeMember(vehicleId: string, userId: string): Promise<void>
  listInvitations(vehicleId: string): Promise<Invitation[]>
  createInvitation(
    vehicleId: string,
    invitedBy: string,
    input: CreateInvitationInput
  ): Promise<Invitation>
  revokeInvitation(vehicleId: string, invitationId: string): Promise<void>
  acceptInvitation(token: string): Promise<AcceptOutcome>
}

/**
 * Accesos compartidos e invitaciones.
 *
 * Las escrituras sobre `vehicle_users` e `invitations` no comprueban el rol
 * aquí: la política RLS `user_vehicle_role(vehicle_id) = 'owner'` ya lo exige,
 * y las rutas lo verifican antes con `loadAccessibleVehicle(..., 'owner')`.
 */
export class SupabaseSharingRepository implements ISharingRepository {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Vía RPC porque la política de `profiles` es `auth.uid() = id`: el
   * propietario no puede leer el perfil de los usuarios a los que dio acceso,
   * y `auth.users` no es accesible desde el cliente.
   */
  async listMembers(vehicleId: string): Promise<VehicleMember[]> {
    const { data, error } = await this.db.rpc('vehicle_members', { p_vehicle: vehicleId })
    if (error) throw error
    return (data ?? []) as VehicleMember[]
  }

  /**
   * Otorga acceso directo, sin invitación — solo el panel admin la usa (un
   * propietario normal siempre pasa por `createInvitation`/`acceptInvitation`,
   * porque el email de invitación no valida un user_id existente). Vía upsert
   * porque el admin puede "re-otorgar" un rol distinto a alguien que ya tenía
   * acceso, sin tener que revocar primero.
   */
  async grantMember(vehicleId: string, userId: string, role: InvitableRole): Promise<void> {
    const { error } = await this.db
      .from('vehicle_users')
      .upsert({ vehicle_id: vehicleId, user_id: userId, role }, { onConflict: 'vehicle_id,user_id' })
    if (error) throw error
  }

  async updateMemberRole(
    vehicleId: string,
    userId: string,
    role: InvitableRole
  ): Promise<void> {
    const { error } = await this.db
      .from('vehicle_users')
      .update({ role })
      .eq('vehicle_id', vehicleId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async revokeMember(vehicleId: string, userId: string): Promise<void> {
    const { error } = await this.db
      .from('vehicle_users')
      .delete()
      .eq('vehicle_id', vehicleId)
      .eq('user_id', userId)
    if (error) throw error
  }

  async listInvitations(vehicleId: string): Promise<Invitation[]> {
    const { data, error } = await this.db
      .from('invitations')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .is('accepted_by', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Invitation[]
  }

  async createInvitation(
    vehicleId: string,
    invitedBy: string,
    input: CreateInvitationInput
  ): Promise<Invitation> {
    // 24 bytes = 192 bits de entropía. El token ES la credencial de acceso
    // (el email de la invitación no se valida al aceptar), así que no puede
    // ser adivinable.
    const token = crypto.randomBytes(24).toString('base64url')

    const { data, error } = await this.db
      .from('invitations')
      .insert({
        vehicle_id: vehicleId,
        invited_by: invitedBy,
        email: input.email ?? null,
        role: input.role,
        token,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Invitation
  }

  async revokeInvitation(vehicleId: string, invitationId: string): Promise<void> {
    const { error } = await this.db
      .from('invitations')
      .delete()
      .eq('id', invitationId)
      .eq('vehicle_id', vehicleId)
    if (error) throw error
  }

  /**
   * Canjea el token. Va por RPC (`accept_invitation`, SECURITY DEFINER) porque
   * el invitado no puede leer la fila de `invitations`: la política es solo
   * para el propietario del vehículo.
   */
  async acceptInvitation(token: string): Promise<AcceptOutcome> {
    const { data, error } = await this.db
      .rpc('accept_invitation', { p_token: token })
      .single<{ result: string; vehicle_id: string | null }>()
    if (error) throw error

    if (data.result === 'OK' && data.vehicle_id) {
      return { ok: true, vehicleId: data.vehicle_id }
    }
    return {
      ok: false,
      reason: data.result as 'INVALID_TOKEN' | 'UNAUTHORIZED' | 'ALREADY_OWNER',
    }
  }
}
