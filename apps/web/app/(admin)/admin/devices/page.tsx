'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Device } from '@securitycar/shared'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table } from '@/components/ui/Table'
import { useAdminDevices } from '@/hooks/useAdmin'

export default function AdminDevicesPage() {
  const [query, setQuery] = useState('')
  const { devices, isLoading, mutate } = useAdminDevices(query)

  const [imei, setImei] = useState('')
  const [iccid, setIccid] = useState('')
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [provisioning, setProvisioning] = useState(false)
  const [newCode, setNewCode] = useState<string | null>(null)
  const [retiring, setRetiring] = useState<string | null>(null)

  const [assigning, setAssigning] = useState<Device | null>(null)
  const [ownerId, setOwnerId] = useState('')
  const [alias, setAlias] = useState('')
  const [plate, setPlate] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assigningLoading, setAssigningLoading] = useState(false)
  const [assignedVehicleId, setAssignedVehicleId] = useState<string | null>(null)

  function openAssign(device: Device) {
    setAssigning(device)
    setOwnerId('')
    setAlias('')
    setPlate('')
    setAssignError(null)
    setAssignedVehicleId(null)
  }

  async function assignDevice() {
    if (!assigning) return
    setAssignError(null)
    setAssigningLoading(true)
    const res = await fetch(`/api/admin/devices/${assigning.id}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner_id: ownerId.trim(),
        alias: alias.trim(),
        plate: plate.trim() || null,
      }),
    })
    const json = await res.json().catch(() => null)
    setAssigningLoading(false)
    if (!res.ok) {
      setAssignError(json?.error ?? 'No se pudo asignar el dispositivo')
      return
    }
    setAssignedVehicleId(json.data.vehicle_id)
    mutate()
  }

  async function provisionDevice() {
    setProvisionError(null)
    setNewCode(null)
    setProvisioning(true)
    const res = await fetch('/api/admin/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imei: imei.trim(), sim_iccid: iccid.trim() || null }),
    })
    const json = await res.json().catch(() => null)
    setProvisioning(false)
    if (!res.ok) {
      setProvisionError(json?.error ?? 'No se pudo provisionar el dispositivo')
      return
    }
    setNewCode(json.data.claim_code)
    setImei('')
    setIccid('')
    mutate()
  }

  async function retireDevice(id: string) {
    await fetch(`/api/admin/devices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'retired' }),
    })
    setRetiring(null)
    mutate()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Dispositivos</h1>
        <div className="w-72">
          <Input
            placeholder="Buscar por IMEI, ICCID o código"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-(--color-text-secondary)">
          Provisionar dispositivo
        </h2>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-56">
            <Input
              label="IMEI"
              placeholder="864895030123456"
              value={imei}
              onChange={e => setImei(e.target.value)}
            />
          </div>
          <div className="w-56">
            <Input
              label="ICCID de la SIM (opcional)"
              value={iccid}
              onChange={e => setIccid(e.target.value)}
            />
          </div>
          <Button onClick={provisionDevice} loading={provisioning} disabled={!imei.trim()}>
            Provisionar
          </Button>
        </div>
        {provisionError && <p className="text-xs text-(--color-danger)">{provisionError}</p>}
        {newCode && (
          <p className="text-sm text-(--color-success)">
            Código de activación: <strong>{newCode}</strong> — entrégalo al cliente, es de un solo uso.
          </p>
        )}
      </Card>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <Table
          rows={devices}
          rowKey={d => d.id}
          emptyLabel="No hay dispositivos que coincidan con la búsqueda"
          columns={[
            { header: 'IMEI', render: d => d.imei },
            { header: 'ICCID', render: d => d.sim_iccid ?? '—' },
            { header: 'Estado', render: d => d.status },
            { header: 'Código', render: d => d.claim_code ?? '—' },
            {
              header: 'Provisionado',
              render: d => new Date(d.created_at).toLocaleDateString(),
            },
            {
              header: 'Reclamado',
              render: d => (d.claimed_at ? new Date(d.claimed_at).toLocaleDateString() : '—'),
            },
            {
              header: 'Acciones',
              render: d => (
                <div className="flex gap-3">
                  {d.status === 'provisioned' && (
                    <button
                      onClick={() => openAssign(d)}
                      className="text-xs text-(--color-accent) hover:underline"
                    >
                      Asignar
                    </button>
                  )}
                  {d.status !== 'retired' && (
                    <button
                      onClick={() => setRetiring(d.id)}
                      className="text-xs text-(--color-danger) hover:underline"
                    >
                      Retirar
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {assigning && (
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-(--color-text-secondary)">
              Asignar dispositivo {assigning.imei} a un usuario
            </h2>
            <button
              onClick={() => setAssigning(null)}
              className="text-xs text-(--color-text-muted) hover:text-(--color-text-primary)"
            >
              Cerrar
            </button>
          </div>
          <p className="text-xs text-(--color-text-muted)">
            Crea el vehículo directamente a nombre del usuario elegido, sin que tenga que
            canjear un código — para instalación en concesionario o alta sin acceso a la app.
            Copia el ID del usuario desde{' '}
            <Link href="/admin/users" className="underline">
              Usuarios
            </Link>
            .
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-64">
              <Input
                label="ID de usuario (dueño)"
                value={ownerId}
                onChange={e => setOwnerId(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Input label="Alias del vehículo" value={alias} onChange={e => setAlias(e.target.value)} />
            </div>
            <div className="w-40">
              <Input
                label="Patente (opcional)"
                value={plate}
                onChange={e => setPlate(e.target.value)}
              />
            </div>
            <Button
              onClick={assignDevice}
              loading={assigningLoading}
              disabled={!ownerId.trim() || !alias.trim()}
            >
              Asignar
            </Button>
          </div>
          {assignError && <p className="text-xs text-(--color-danger)">{assignError}</p>}
          {assignedVehicleId && (
            <p className="text-sm text-(--color-success)">
              Vehículo creado.{' '}
              <Link href={`/admin/vehicles/${assignedVehicleId}`} className="underline">
                Ver vehículo
              </Link>
            </p>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={retiring !== null}
        description="El dispositivo pasará a estado 'retired' y dejará de estar disponible."
        confirmLabel="Retirar"
        onConfirm={() => retiring && retireDevice(retiring)}
        onCancel={() => setRetiring(null)}
      />
    </div>
  )
}
