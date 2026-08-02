'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useVehicleContext } from '@/components/VehicleProvider'

export function VehicleSwitcher() {
  const { vehicles, selected, selectVehicle } = useVehicleContext()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (vehicles.length === 0) return null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-(--color-border) bg-(--color-bg-surface) py-2 pl-3.5 pr-2.5 text-sm text-(--color-text-primary) outline-none transition-all duration-150 hover:border-(--color-text-muted) focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent)/25"
      >
        <span className="font-medium">{selected?.alias ?? 'Seleccionar vehículo'}</span>
        <ChevronDown
          size={16}
          className={`text-(--color-text-muted) transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="shadow-floating absolute left-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-(--color-border) bg-(--color-bg-surface)/90 backdrop-blur-md"
        >
          {vehicles.map(v => (
            <button
              key={v.id}
              type="button"
              role="option"
              aria-selected={v.id === selected?.id}
              onClick={() => {
                selectVehicle(v.id)
                setOpen(false)
              }}
              className={`flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left text-sm transition-colors ${
                v.id === selected?.id
                  ? 'bg-(--color-accent)/10 text-(--color-accent)'
                  : 'text-(--color-text-primary) hover:bg-(--color-bg-elevated)'
              }`}
            >
              <span className="font-medium">{v.alias}</span>
              {v.plate && <span className="text-xs text-(--color-text-muted)">{v.plate}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
