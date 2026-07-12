'use client'

import type { Vehicle } from '@securitycar/shared'
import { createContext, useContext, useMemo, useState } from 'react'
import { useVehicles } from '@/hooks/useVehicles'

interface VehicleContextValue {
  vehicles: Vehicle[]
  selected: Vehicle | null
  selectVehicle: (id: string) => void
  isLoading: boolean
  error: unknown
}

const VehicleContext = createContext<VehicleContextValue | null>(null)

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const { vehicles, isLoading, error } = useVehicles()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const value = useMemo<VehicleContextValue>(() => {
    // Derive selection: honor explicit choice, otherwise fall back to the
    // first vehicle. No effect needed — avoids cascading renders.
    const selected =
      vehicles.find(v => v.id === selectedId) ?? vehicles[0] ?? null
    return {
      vehicles,
      selected,
      selectVehicle: setSelectedId,
      isLoading,
      error,
    }
  }, [vehicles, selectedId, isLoading, error])

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>
}

export function useVehicleContext() {
  const ctx = useContext(VehicleContext)
  if (!ctx) throw new Error('useVehicleContext must be used within VehicleProvider')
  return ctx
}
