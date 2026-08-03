'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ROLE_LABEL, type InvitableRole } from '@securitycar/shared'
import { ArrowLeft, Lock, Unlock } from 'lucide-react'
import { Card, Stat } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CommandButton } from '@/components/security/CommandButton'
import { useAdminVehicle } from '@/hooks/useAdmin'

export default function AdminVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { detail, isLoading, mutate } = useAdminVehicle(id)
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<InvitableRole>('viewer')
  const [grantError, setGrantError] = useState<string | null>(null)
  const [granting, setGranting] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeConfirm, setRemoveConfirm] = useState(false)

  async function removeVehicle() {
    setRemoving(true)
    const res = await fetch(`/api/admin/vehicles/${id}`, { method: 'DELETE' })
    setRemoving(false)
    setRemoveConfirm(false)
    if (res.ok) {
      router.push('/admin/vehicles')
    } else {
      mutate()
    }
  }

  async function grantMember() {
    setGrantError(null)
    setGranting(true)
    const res = await fetch(`/api/admin/vehicles/${id}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId.trim(), role }),
    })
    setGranting(false)
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      setGrantError(json?.error ?? 'No se pudo otorgar el acceso')
      return
    }
    setUserId('')
    mutate()
  }

  async function changeRole(targetUserId: string, next: InvitableRole) {
    await fetch(`/api/admin/vehicles/${id}/users/${targetUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    })
    mutate()
  }

  async function revokeMember(targetUserId: string) {
    await fetch(`/api/admin/vehicles/${id}/users/${targetUserId}`, { method: 'DELETE' })
    setRevoking(null)
    mutate()
  }

  if (isLoading || !detail) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    )
  }

  const { vehicle, members, commands } = detail

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/vehicles"
        className="flex w-fit items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text-primary)"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        Vehículos
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{vehicle.alias}</h1>
        {vehicle.deleted_at ? (
          <span className="rounded-full bg-(--color-danger)/10 px-3 py-1 text-xs font-medium text-(--color-danger)">
            Eliminado el {new Date(vehicle.deleted_at).toLocaleDateString()}
          </span>
        ) : (
          <button
            onClick={() => setRemoveConfirm(true)}
            className="text-xs text-(--color-danger) hover:underline"
          >
            Dar de baja
          </button>
        )}
      </div>

      <Card className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Dueño" value={vehicle.owner_email} />
        <Stat label="Patente" value={vehicle.plate ?? '—'} />
        <Stat label="Marca / Modelo" value={[vehicle.make, vehicle.model].filter(Boolean).join(' ') || '—'} />
        <Stat label="IMEI" value={vehicle.imei ?? '—'} />
        <Stat label="Estado del equipo" value={vehicle.device_status ?? '—'} />
        <Stat label="Alta" value={new Date(vehicle.created_at).toLocaleDateString()} />
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-(--color-text-secondary)">Comandos</h2>
        <div className="flex flex-wrap gap-2">
          <CommandButton
            vehicleId={vehicle.id}
            endpoint={`/api/admin/vehicles/${vehicle.id}/commands`}
            type="engine_block"
            label="Bloquear motor"
            icon={Lock}
            variant="danger"
            confirmText="El motor no podrá arrancar hasta que se desbloquee."
          />
          <CommandButton
            vehicleId={vehicle.id}
            endpoint={`/api/admin/vehicles/${vehicle.id}/commands`}
            type="engine_unblock"
            label="Desbloquear motor"
            icon={Unlock}
            variant="success"
            confirmText="Se permitirá que el motor arranque nuevamente."
          />
        </div>

        {commands.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 border-t border-(--color-border) pt-3 text-xs text-(--color-text-muted)">
            {commands.slice(0, 8).map(c => (
              <div key={c.id} className="flex justify-between gap-2">
                <span>{c.command_type}</span>
                <span>{c.status}</span>
                <span>{new Date(c.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-(--color-text-secondary)">Personas con acceso</h2>

        {members.length === 0 && (
          <p className="text-xs text-(--color-text-muted)">Nadie más tiene acceso todavía.</p>
        )}

        {members.map(m => (
          <div key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
            <div className="flex min-w-0 flex-col">
              <span className="truncate">{m.display_name || m.email}</span>
              <span className="truncate text-xs text-(--color-text-muted)">
                {m.display_name && `${m.email} · `}
                Desde {new Date(m.granted_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <select
                value={m.role}
                onChange={e => changeRole(m.user_id, e.target.value as InvitableRole)}
                className="rounded-lg bg-(--color-bg-elevated) px-2 py-1 text-xs"
              >
                <option value="viewer">{ROLE_LABEL.viewer}</option>
                <option value="driver">{ROLE_LABEL.driver}</option>
              </select>
              <button
                onClick={() => setRevoking(m.user_id)}
                className="text-xs text-(--color-danger) hover:underline"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-2 rounded-xl bg-(--color-bg-elevated) p-3">
          <h3 className="text-xs font-semibold text-(--color-text-secondary)">Otorgar acceso</h3>
          <p className="text-xs text-(--color-text-muted)">
            Copia el ID del usuario desde{' '}
            <Link href="/admin/users" className="underline">
              Usuarios
            </Link>
            .
          </p>
          <Input
            placeholder="ID de usuario"
            value={userId}
            onChange={e => setUserId(e.target.value)}
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value as InvitableRole)}
            className="rounded-lg bg-(--color-bg-base) px-3 py-2 text-sm"
          >
            <option value="viewer">{ROLE_LABEL.viewer}</option>
            <option value="driver">{ROLE_LABEL.driver}</option>
          </select>
          {grantError && <p className="text-xs text-(--color-danger)">{grantError}</p>}
          <Button onClick={grantMember} loading={granting} disabled={!userId.trim()}>
            Otorgar acceso
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={revoking !== null}
        description="Se revocará el acceso de este usuario al vehículo."
        confirmLabel="Quitar acceso"
        onConfirm={() => revoking && revokeMember(revoking)}
        onCancel={() => setRevoking(null)}
      />

      <ConfirmDialog
        open={removeConfirm}
        description="El vehículo se dará de baja (soft-delete): desaparece de la app del cliente pero su historial de comandos se conserva. Usalo, por ejemplo, al dar de baja al usuario dueño."
        confirmLabel="Dar de baja"
        loading={removing}
        onConfirm={removeVehicle}
        onCancel={() => setRemoveConfirm(false)}
      />
    </div>
  )
}
