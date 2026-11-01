'use client'

import type { Geofence } from '@securitycar/shared'
import useSWR from 'swr'
import { fetcher } from './fetcher'

export function useGeofences(vehicleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Geofence[]>(
    vehicleId ? `/api/vehicles/${vehicleId}/geofences` : null,
    fetcher
  )
  return { geofences: data ?? [], error, isLoading, mutate }
}
