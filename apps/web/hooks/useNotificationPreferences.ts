'use client'

import type { AlertEventType, NotificationPreferences } from '@securitycar/shared'
import useSWR from 'swr'
import { fetcher } from './fetcher'

export function useNotificationPreferences(vehicleId: string | null) {
  const key = vehicleId ? `/api/vehicles/${vehicleId}/notifications` : null
  const { data, error, isLoading, mutate } = useSWR<NotificationPreferences>(key, fetcher)

  /** Optimista: el switch cambia al instante y se revierte si la API falla. */
  async function toggle(type: AlertEventType): Promise<string | null> {
    if (!key || !data) return null
    const next = !data[type]
    mutate({ ...data, [type]: next }, false)
    const res = await fetch(key, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type]: next }),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      mutate(data, false)
      return json?.error ?? 'No se pudo guardar'
    }
    mutate(json.data, false)
    return null
  }

  return { preferences: data, error, isLoading, toggle }
}
