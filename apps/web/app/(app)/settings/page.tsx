'use client'

import { useState } from 'react'
import { ROLE_LABEL } from '@securitycar/shared'
import { useVehicleContext } from '@/components/VehicleProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { ShareVehicle } from '@/components/vehicle/ShareVehicle'
import { useVehicles } from '@/hooks/useVehicles'

export default function SettingsPage() {
  const { vehicles } = useVehicleContext()
  const { mutate } = useVehicles()
  const [alias, setAlias] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sharingId, setSharingId] = useState<string | null>(null)

  async function addVehicle(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alias, claim_code: claimCode }),
    })
    const json = await res.json().catch(() => null)
    setLoading(false)
    if (!res.ok) {
      setError(json?.error ?? 'No se pudo agregar el vehículo')
      return
    }
    setAlias('')
    setClaimCode('')
    if (json?.data?.has_signal === false) {
      setNotice('Vehículo agregado. El equipo aún no reporta señal; puede tardar unos minutos tras la instalación.')
    }
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
            id="claim-code"
            label="Código de activación"
            placeholder="AB3D-9XKF"
            autoComplete="off"
            spellCheck={false}
            value={claimCode}
            onChange={e => setClaimCode(e.target.value.toUpperCase())}
            required
          />
          <p className="text-xs text-[--color-text-muted]">
            Lo encuentras en la tarjeta entregada con tu equipo GPS.
          </p>
          {error && <p className="text-sm text-[--color-danger]">{error}</p>}
          {notice && <p className="text-sm text-[--color-text-muted]">{notice}</p>}
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
        {vehicles.map(v => {
          const isOwner = v.effective_role === 'owner'
          return (
            <div
              key={v.id}
              className="flex flex-col gap-3 rounded-xl bg-[--color-bg-elevated] px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{v.alias}</span>
                  <span className="text-xs text-[--color-text-muted]">
                    IMEI {v.device.imei}
                    {!isOwner && ` · ${ROLE_LABEL[v.effective_role]}`}
                  </span>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 gap-3">
                    <button
                      onClick={() => setSharingId(sharingId === v.id ? null : v.id)}
                      className="text-xs text-[--color-accent] hover:underline"
                    >
                      {sharingId === v.id ? 'Cerrar' : 'Compartir'}
                    </button>
                    <button
                      onClick={() => removeVehicle(v.id)}
                      className="text-xs text-[--color-danger] hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
              {isOwner && sharingId === v.id && <ShareVehicle vehicleId={v.id} />}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
