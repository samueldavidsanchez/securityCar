'use client'

import type { Invitation, VehicleMember } from '@securitycar/shared'
import useSWR from 'swr'
import { fetcher } from './fetcher'

export function useVehicleMembers(vehicleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<VehicleMember[]>(
    vehicleId ? `/api/vehicles/${vehicleId}/users` : null,
    fetcher
  )
  return { members: data ?? [], error, isLoading, mutate }
}

export function useVehicleInvitations(vehicleId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Invitation[]>(
    vehicleId ? `/api/vehicles/${vehicleId}/invitations` : null,
    fetcher
  )
  return { invitations: data ?? [], error, isLoading, mutate }
}
