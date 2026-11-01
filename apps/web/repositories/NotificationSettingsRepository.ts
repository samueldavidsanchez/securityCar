import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ALERT_DEFAULTS,
  ALERT_EVENT_TYPES,
  type AlertEventType,
  type NotificationPreferences,
  type UpdateNotificationPreferencesInput,
} from '@securitycar/shared'

export interface INotificationSettingsRepository {
  getForVehicle(userId: string, vehicleId: string): Promise<NotificationPreferences>
  update(
    userId: string,
    vehicleId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences>
}

/**
 * Preferencias de push por usuario y vehículo sobre `notification_settings`
 * (tabla de 0001, RLS "own notifications"). Una fila existe solo si el usuario
 * tocó el switch; si no, rige `ALERT_DEFAULTS`.
 */
export class SupabaseNotificationSettingsRepository implements INotificationSettingsRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getForVehicle(userId: string, vehicleId: string): Promise<NotificationPreferences> {
    const { data, error } = await this.db
      .from('notification_settings')
      .select('event_type, enabled')
      .eq('user_id', userId)
      .eq('vehicle_id', vehicleId)
      .in('event_type', [...ALERT_EVENT_TYPES])
    if (error) throw error

    const prefs: NotificationPreferences = { ...ALERT_DEFAULTS }
    for (const row of (data ?? []) as { event_type: AlertEventType; enabled: boolean }[]) {
      prefs[row.event_type] = row.enabled
    }
    return prefs
  }

  async update(
    userId: string,
    vehicleId: string,
    input: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    const rows = Object.entries(input).map(([event_type, enabled]) => ({
      user_id: userId,
      vehicle_id: vehicleId,
      event_type,
      enabled,
    }))
    const { error } = await this.db
      .from('notification_settings')
      .upsert(rows, { onConflict: 'user_id,vehicle_id,event_type' })
    if (error) throw error
    return this.getForVehicle(userId, vehicleId)
  }
}
