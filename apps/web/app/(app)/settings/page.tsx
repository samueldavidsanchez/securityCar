'use client'

import { useState } from 'react'
import { useVehicleContext } from '@/components/VehicleProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useVehicles } from '@/hooks/useVehicles'

export default function SettingsPage() {
  const { vehicles } = useVehicleContext()
  const { mutate } = useVehicles()
  const [alias, setAlias] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias, flespi_device_id: Number(deviceId) }),
    })
    setLoading(false)
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setError(json?.error ?? 'No se pudo agregar el vehículo')
      return
    }
    setAlias('')
    setDeviceId('')
    mutate()
  }

  async function removeVehicle(id: string) {
    await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Agregar vehículo</h2>
        <form onSubmit={addVehicle} className="flex flex-col gap-3">
          <Input
            id="alias"
            label="Alias"
            placeholder="Mi Corolla"
            value={alias}
            onChange={e => setAlias(e.target.value)}
            required
          />
          <Input
            id="device"
            label="ID de dispositivo Flespi"
            type="number"
            placeholder="123456"
            value={deviceId}
            onChange={e => setDeviceId(e.target.value)}
            required
          />
          {error && <p className="text-sm text-[--color-danger]">{error}</p>}
          <Button type="submit" loading={loading}>
            Agregar
          </Button>
        </form>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Mis vehículos</h2>
        {vehicles.length === 0 && (
          <p className="text-sm text-[--color-text-muted]">Aún no tienes vehículos.</p>
        )}
        {vehicles.map(v => (
          <div
            key={v.id}
            className="flex items-center justify-between rounded-xl bg-[--color-bg-elevated] px-3 py-2.5"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{v.alias}</span>
              <span className="text-xs text-[--color-text-muted]">
                Dispositivo #{v.flespi_device_id}
              </span>
            </div>
            <button
              onClick={() => removeVehicle(v.id)}
              className="text-xs text-[--color-danger] hover:underline"
            >
              Eliminar
            </button>
          </div>
        ))}
      </Card>
    </div>
  )
}
