import type { Vehicle } from '@securitycar/shared'
import { createContext, useContext, useMemo, useState } from 'react'
import { useVehicles } from '@/hooks/useVehicles'

interface VehicleContextValue {
  vehicles: Vehicle[]
  selected: Vehicle | null
  selectVehicle: (id: string) => void
  isLoading: boolean
  error: unknown
  mutate: () => void
}

const VehicleContext = createContext<VehicleContextValue | null>(null)

export function VehicleProvider({ children }: { children: React.ReactNode }) {
  const { vehicles, isLoading, error, mutate } = useVehicles()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const value = useMemo<VehicleContextValue>(() => {
    const selected = vehicles.find(v => v.id === selectedId) ?? vehicles[0] ?? null
    return { vehicles, selected, selectVehicle: setSelectedId, isLoading, error, mutate }
  }, [vehicles, selectedId, isLoading, error, mutate])

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>
}

export function useVehicleContext() {
  const ctx = useContext(VehicleContext)
  if (!ctx) throw new Error('useVehicleContext must be used within VehicleProvider')
  return ctx
}
