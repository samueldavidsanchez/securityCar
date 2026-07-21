'use client'

import { useState } from 'react'
import { ROLE_LABEL, type InvitableRole } from '@securitycar/shared'
import { Button } from '@/components/ui/Button'
import { useVehicleInvitations, useVehicleMembers } from '@/hooks/useSharing'

/**
 * Panel de accesos de un vehículo. Solo se monta para vehículos donde el
 * usuario es propietario — los endpoints devuelven 403 en caso contrario.
 */
export function ShareVehicle({ vehicleId }: { vehicleId: string }) {
  const { members, mutate: mutateMembers } = useVehicleMembers(vehicleId)
  const { invitations, mutate: mutateInvites } = useVehicleInvitations(vehicleId)
  const [role, setRole] = useState<InvitableRole>('viewer')
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function createInvitation() {
    setError(null)
    setLoading(true)
    const res = await fetch(`/api/vehicles/${vehicleId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, email: email.trim() || null }),
    })
    const json = await res.json().catch(() => null)
    setLoading(false)
    if (!res.ok) {
      setError(json?.error ?? 'No se pudo crear la invitación')
      return
    }
    setLink(json.data.url)
    setEmail('')
    mutateInvites()
  }

  async function revokeMember(userId: string) {
    await fetch(`/api/vehicles/${vehicleId}/users/${userId}`, { method: 'DELETE' })
    mutateMembers()
  }

  async function changeRole(userId: string, next: InvitableRole) {
    await fetch(`/api/vehicles/${vehicleId}/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: next }),
    })
    mutateMembers()
  }

  async function revokeInvitation(invitationId: string) {
    await fetch(`/api/vehicles/${vehicleId}/invitations/${invitationId}`, { method: 'DELETE' })
    mutateInvites()
  }

  return (
    <div className="flex flex-col gap-3 border-t border-[--color-border] pt-3">
      <h3 className="text-xs font-semibold text-[--color-text-secondary]">Personas con acceso</h3>

      {members.length === 0 && (
        <p className="text-xs text-[--color-text-muted]">Nadie más tiene acceso todavía.</p>
      )}

      {members.map(m => (
        <div key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{m.display_name || m.email}</span>
            {m.display_name && (
              <span className="truncate text-xs text-[--color-text-muted]">{m.email}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <select
              value={m.role}
              onChange={e => changeRole(m.user_id, e.target.value as InvitableRole)}
              className="rounded-lg bg-[--color-bg-elevated] px-2 py-1 text-xs"
            >
              <option value="viewer">{ROLE_LABEL.viewer}</option>
              <option value="driver">{ROLE_LABEL.driver}</option>
            </select>
            <button
              onClick={() => revokeMember(m.user_id)}
              className="text-xs text-[--color-danger] hover:underline"
            >
              Quitar
            </button>
          </div>
        </div>
      ))}

      {invitations.length > 0 && (
        <>
          <h3 className="text-xs font-semibold text-[--color-text-secondary]">
            Invitaciones pendientes
          </h3>
          {invitations.map(inv => (
            <div key={inv.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-xs text-[--color-text-muted]">
                {inv.email || 'Enlace sin destinatario'} · {ROLE_LABEL[inv.role]}
              </span>
              <button
                onClick={() => revokeInvitation(inv.id)}
                className="shrink-0 text-xs text-[--color-danger] hover:underline"
              >
                Revocar
              </button>
            </div>
          ))}
        </>
      )}

      <div className="flex flex-col gap-2 rounded-xl bg-[--color-bg-elevated] p-3">
        <h3 className="text-xs font-semibold text-[--color-text-secondary]">Invitar</h3>
        <input
          type="email"
          placeholder="Correo (opcional, solo como referencia)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="rounded-lg bg-[--color-bg-base] px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={e => setRole(e.target.value as InvitableRole)}
          className="rounded-lg bg-[--color-bg-base] px-3 py-2 text-sm"
        >
          <option value="viewer">{ROLE_LABEL.viewer} — solo ver ubicación y estado</option>
          <option value="driver">{ROLE_LABEL.driver} — además puede enviar comandos</option>
        </select>
        {error && <p className="text-xs text-[--color-danger]">{error}</p>}
        <Button onClick={createInvitation} loading={loading}>
          Generar enlace de invitación
        </Button>

        {link && (
          <div className="flex flex-col gap-1">
            <p className="text-xs text-[--color-text-muted]">
              Comparte este enlace. Caduca en 7 días y solo sirve una vez —
              cualquiera que lo tenga puede aceptarlo.
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                onFocus={e => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg bg-[--color-bg-base] px-3 py-2 text-xs"
              />
              <Button
                variant="secondary"
                onClick={() => navigator.clipboard.writeText(link)}
              >
                Copiar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
