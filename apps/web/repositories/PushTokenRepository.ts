import type { SupabaseClient } from '@supabase/supabase-js'
import { ALERT_DEFAULTS, type AlertEventType, type RegisterPushTokenInput } from '@securitycar/shared'

export interface IPushTokenRepository {
  register(input: RegisterPushTokenInput): Promise<void>
  unregister(token: string): Promise<void>
  findRecipientTokens(vehicleId: string, eventType: AlertEventType): Promise<string[]>
  removeTokens(tokens: string[]): Promise<void>
}

export class SupabasePushTokenRepository implements IPushTokenRepository {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * Vía RPC y no upsert directo: si el token ya pertenecía a otra cuenta (otro
   * login en el mismo teléfono), RLS impediría reasignarlo (migración 0009).
   */
  async register({ token, platform }: RegisterPushTokenInput): Promise<void> {
    const { error } = await this.db.rpc('register_push_token', {
      p_token: token,
      p_platform: platform,
    })
    if (error) throw error
  }

  /** RLS acota el borrado a los tokens propios. */
  async unregister(token: string): Promise<void> {
    const { error } = await this.db.from('push_tokens').delete().eq('token', token)
    if (error) throw error
  }

  /**
   * Tokens de los usuarios con acceso al vehículo (dueño + compartidos) que
   * quieren este tipo de alerta. Sin fila en `notification_settings` rige
   * `ALERT_DEFAULTS`: si el default es "activado" se excluye a quien lo apagó;
   * si es "desactivado" (encendido/apagado) solo se incluye a quien lo
   * encendió. Requiere el service client: cruza usuarios y lo invoca el webhook.
   */
  async findRecipientTokens(vehicleId: string, eventType: AlertEventType): Promise<string[]> {
    const [vehicle, members] = await Promise.all([
      this.db.from('vehicles').select('owner_id').eq('id', vehicleId).is('deleted_at', null).maybeSingle<{ owner_id: string }>(),
      this.db.from('vehicle_users').select('user_id').eq('vehicle_id', vehicleId),
    ])
    if (vehicle.error) throw vehicle.error
    if (members.error) throw members.error
    if (!vehicle.data) return []

    const userIds = new Set<string>([vehicle.data.owner_id])
    for (const m of (members.data ?? []) as { user_id: string }[]) userIds.add(m.user_id)

    const defaultOn = ALERT_DEFAULTS[eventType]
    const { data: overrides, error: overridesError } = await this.db
      .from('notification_settings')
      .select('user_id')
      .in('user_id', [...userIds])
      .eq('vehicle_id', vehicleId)
      .eq('event_type', eventType)
      .eq('enabled', !defaultOn)
    if (overridesError) throw overridesError
    const flipped = new Set(((overrides ?? []) as { user_id: string }[]).map(o => o.user_id))
    const recipients = [...userIds].filter(id => (defaultOn ? !flipped.has(id) : flipped.has(id)))
    if (recipients.length === 0) return []

    const { data, error } = await this.db
      .from('push_tokens')
      .select('token')
      .in('user_id', recipients)
    if (error) throw error
    return ((data ?? []) as { token: string }[]).map(r => r.token)
  }

  async removeTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return
    const { error } = await this.db.from('push_tokens').delete().in('token', tokens)
    if (error) throw error
  }
}
