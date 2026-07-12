import type { GpsPosition, TelemetryData, Vehicle, VehicleStatus } from '@securitycar/shared'
import useSWR from 'swr'
import { fetcher } from '@/lib/api'

const POLL_MS = 10_000

export function useVehicles() {
  const { data, error, isLoading, mutate } = useSWR<Vehicle[]>('/api/vehicles', fetcher)
  return { vehicles: data ?? [], error, isLoading, mutate }
}

export function useVehicleStatus(vehicleId: string | null) {
  const { data, error, isLoading } = useSWR<VehicleStatus>(
    vehicleId ? `/api/vehicles/${vehicleId}/status` : null,
    fetcher,
    { refreshInterval: POLL_MS }
  )
  return { status: data, error, isLoading }
}

export function useVehicleLocation(vehicleId: string | null) {
  const { data, error, isLoading } = useSWR<GpsPosition>(
    vehicleId ? `/api/vehicles/${vehicleId}/location` : null,
    fetcher,
    { refreshInterval: POLL_MS }
  )
  return { position: data, error, isLoading }
}

export function useVehicleTelemetry(vehicleId: string | null) {
  const { data, error, isLoading } = useSWR<TelemetryData>(
    vehicleId ? `/api/vehicles/${vehicleId}/telemetry` : null,
    fetcher,
    { refreshInterval: POLL_MS }
  )
  return { telemetry: data, error, isLoading }
}
