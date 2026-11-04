import type { AlertEventType, NotificationPreferences } from '@securitycar/shared'
import useSWR from 'swr'
import { api, fetcher } from '@/lib/api'

export function useNotificationPreferences(vehicleId: string | null) {
  const key = vehicleId ? `/api/vehicles/${vehicleId}/notifications` : null
  const { data, error, isLoading, mutate } = useSWR<NotificationPreferences>(key, fetcher)

  /** Optimista: el switch cambia al instante y se revierte si la API falla. */
  async function toggle(type: AlertEventType): Promise<string | null> {
    if (!key || !data) return null
    const next = !data[type]
    mutate({ ...data, [type]: next }, false)
    try {
      const saved = await api<NotificationPreferences>(key, {
        method: 'PUT',
        body: JSON.stringify({ [type]: next }),
      })
      mutate(saved, false)
      return null
    } catch (e) {
      mutate(data, false)
      return e instanceof Error ? e.message : 'No se pudo guardar'
    }
  }

  return { preferences: data, error, isLoading, toggle }
}
