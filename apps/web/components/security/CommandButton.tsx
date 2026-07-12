'use client'

import type { CommandType } from '@securitycar/shared'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  vehicleId: string
  type: CommandType
  label: string
  icon: string
  variant?: 'primary' | 'danger' | 'success' | 'secondary'
  confirmText: string
}

export function CommandButton({
  vehicleId,
  type,
  label,
  icon,
  variant = 'secondary',
  confirmText,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)

  async function send() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/commands`, {
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

  return (
    <div className="flex flex-col gap-2">
      <Button variant={variant} onClick={() => setConfirming(true)} loading={loading}>
        <span>{icon}</span>
        {label}
      </Button>

      {result === 'ok' && <span className="text-xs text-[--color-success]">Comando enviado ✓</span>}
      {result === 'error' && (
        <span className="text-xs text-[--color-danger]">No se pudo enviar el comando</span>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[--color-border] bg-[--color-bg-surface] p-5">
            <div className="mb-1 flex items-center gap-2 text-[--color-warning]">
              <span>⚠️</span>
              <span className="text-sm font-semibold">Confirmar acción</span>
            </div>
            <p className="mb-4 text-sm text-[--color-text-secondary]">{confirmText}</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button variant={variant} className="flex-1" onClick={send} loading={loading}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
