'use client'

import { useVehicleContext } from '@/components/VehicleProvider'

export function VehicleSwitcher() {
  const { vehicles, selected, selectVehicle } = useVehicleContext()

  if (vehicles.length === 0) return null

  return (
    <select
      value={selected?.id ?? ''}
      onChange={e => selectVehicle(e.target.value)}
      className="rounded-xl border border-[--color-border] bg-[--color-bg-surface] px-3 py-2 text-sm text-[--color-text-primary] outline-none focus:border-[--color-accent]"
    >
      {vehicles.map(v => (
        <option key={v.id} value={v.id}>
          {v.alias}
        </option>
      ))}
    </select>
  )
}
