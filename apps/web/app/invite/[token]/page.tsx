'use client'

import { useRouter } from 'next/navigation'
import { use, useState } from 'react'
import useSWR from 'swr'
import { ROLE_LABEL, type VehicleRole } from '@securitycar/shared'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { fetcher } from '@/hooks/fetcher'

interface Preview {
  vehicle_alias: string
  role: VehicleRole
  expires_at: string
}

/**
 * Canje de una invitación. El proxy exige sesión, así que quien llegue aquí sin
 * estar autenticado pasa antes por /login?next=/invite/<token> y vuelve.
 *
 * La aceptación es un botón explícito, no un efecto al montar: es una acción
 * con consecuencias de seguridad (da acceso a la ubicación en vivo del
 * vehículo) y el usuario debe ver qué acepta. De paso evita el doble POST que
 * provocaría el doble montaje de React en desarrollo.
 */
export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const { data, error: loadError, isLoading } = useSWR<Preview>(
    `/api/invitations/${token}`,
    fetcher
  )

  async function accept() {
    setError(null)
    setAccepting(true)
    const res = await fetch(`/api/invitations/${token}/accept`, { method: 'POST' })
    const json = await res.json().catch(() => null)
    setAccepting(false)
    if (!res.ok) {
      setError(json?.error ?? 'No se pudo aceptar la invitación')
      return
    }
    router.push('/map')
    router.refresh()
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center p-4">
      <Card className="flex w-full flex-col gap-4 p-6">
        <h1 className="text-lg font-semibold">Invitación a un vehículo</h1>

        {isLoading && <p className="text-sm text-[--color-text-muted]">Comprobando invitación…</p>}

        {loadError && (
          <>
            <p className="text-sm text-[--color-danger]">
              Esta invitación no es válida, ya se usó o caducó.
            </p>
            <Button variant="secondary" onClick={() => router.push('/map')}>
              Volver
            </Button>
          </>
        )}

        {data && (
          <>
            <p className="text-sm text-[--color-text-secondary]">
              Te han dado acceso a <strong>{data.vehicle_alias}</strong> como{' '}
              <strong>{ROLE_LABEL[data.role]}</strong>.
            </p>
            {data.role === 'driver' && (
              <p className="text-xs text-[--color-text-muted]">
                Como conductor podrás ver la ubicación y enviar comandos al vehículo.
              </p>
            )}
            {data.role === 'viewer' && (
              <p className="text-xs text-[--color-text-muted]">
                Podrás ver la ubicación y el estado, pero no enviar comandos.
              </p>
            )}
            {error && <p className="text-sm text-[--color-danger]">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={accept} loading={accepting} className="flex-1">
                Aceptar
              </Button>
              <Button variant="secondary" onClick={() => router.push('/map')}>
                Ahora no
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
