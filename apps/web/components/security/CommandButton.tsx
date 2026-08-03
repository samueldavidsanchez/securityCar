'use client'

import type { CommandType } from '@securitycar/shared'
import { Check, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SlideToConfirm } from './SlideToConfirm'

interface Props {
  vehicleId: string
  type: CommandType
  label: string
  icon: LucideIcon
  variant?: 'primary' | 'danger' | 'success' | 'secondary'
  confirmText: string
  /**
   * 'slide' reemplaza el botón + modal por un control deslizante: el gesto
   * en sí es la confirmación. Reservado para acciones físicas irreversibles
   * (bloquear/desbloquear motor) — solo válido con variant danger/success.
   */
  confirmMode?: 'modal' | 'slide'
  /** Permite reusar el componente desde el panel admin, que envía comandos
   * contra `/api/admin/vehicles/[id]/commands` en vez de la ruta de consumidor. */
  endpoint?: string
}

export function CommandButton({
  vehicleId,
  type,
  label,
  icon: Icon,
  variant = 'secondary',
  confirmText,
  confirmMode = 'modal',
  endpoint,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)

  async function send() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(endpoint ?? `/api/vehicles/${vehicleId}/commands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      setResult(res.ok ? 'ok' : 'error')
    } catch {
      setResult('error')
    } finally {
      setLoading(false)
      setConfirming(false)
    }
  }

  const useSlide = confirmMode === 'slide' && (variant === 'danger' || variant === 'success')

  return (
    <div className="flex flex-col gap-2">
      {useSlide ? (
        <>
          <SlideToConfirm label={label} icon={Icon} variant={variant} loading={loading} onConfirm={send} />
          <p className="text-xs text-(--color-text-muted)">{confirmText}</p>
        </>
      ) : (
        <Button variant={variant} onClick={() => setConfirming(true)} loading={loading}>
          <Icon size={16} strokeWidth={2} aria-hidden />
          {label}
        </Button>
      )}

      {result === 'ok' && (
        <span className="flex items-center gap-1 text-xs text-(--color-success)">
          <Check size={13} strokeWidth={2.5} aria-hidden /> Comando enviado
        </span>
      )}
      {result === 'error' && (
        <span className="text-xs text-(--color-danger)">No se pudo enviar el comando</span>
      )}

      <ConfirmDialog
        open={confirming}
        description={confirmText}
        variant={variant}
        loading={loading}
        onConfirm={send}
        onCancel={() => setConfirming(false)}
      />
    </div>
  )
}
