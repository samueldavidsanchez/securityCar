'use client'

import type {
  AdminUserAccessRow,
  AdminUserSummary,
  AdminVehicleSummary,
  CommandLog,
  Device,
  VehicleMember,
} from '@securitycar/shared'
import useSWR from 'swr'
import { fetcher } from './fetcher'

// Sin refreshInterval: datos de operación admin, no telemetría en vivo.

export function useAdminVehicles(query?: string) {
  const q = query ? `?q=${encodeURIComponent(query)}` : ''
  const { data, error, isLoading, mutate } = useSWR<AdminVehicleSummary[]>(
    `/api/admin/vehicles${q}`,
    fetcher
  )
  return { vehicles: data ?? [], error, isLoading, mutate }
}

interface AdminVehicleDetail {
  vehicle: AdminVehicleSummary
  members: VehicleMember[]
  commands: CommandLog[]
}

export function useAdminVehicle(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<AdminVehicleDetail>(
    id ? `/api/admin/vehicles/${id}` : null,
    fetcher
  )
  return { detail: data, error, isLoading, mutate }
}

export function useAdminDevices(query?: string) {
  const q = query ? `?q=${encodeURIComponent(query)}` : ''
  const { data, error, isLoading, mutate } = useSWR<Device[]>(`/api/admin/devices${q}`, fetcher)
  return { devices: data ?? [], error, isLoading, mutate }
}

export function useAdminUsers(query?: string) {
  const q = query ? `?q=${encodeURIComponent(query)}` : ''
  const { data, error, isLoading, mutate } = useSWR<AdminUserSummary[]>(
    `/api/admin/users${q}`,
    fetcher
  )
  return { users: data ?? [], error, isLoading, mutate }
}

export function useAdminUserAccess(userId: string | null) {
  const { data, error, isLoading } = useSWR<AdminUserAccessRow[]>(
    userId ? `/api/admin/users/${userId}/access` : null,
    fetcher
  )
  return { access: data ?? [], error, isLoading }
}
