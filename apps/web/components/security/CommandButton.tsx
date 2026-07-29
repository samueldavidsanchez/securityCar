'use client'

import type { CommandType } from '@securitycar/shared'
import { Check, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface Props {
  vehicleId: string
  type: CommandType
  label: string
  icon: LucideIcon
  variant?: 'primary' | 'danger' | 'success' | 'secondary'
  confirmText: string
}

export function CommandButton({
  vehicleId,
  type,
  label,
  icon: Icon,
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
        <Icon size={16} strokeWidth={2} aria-hidden />
        {label}
      </Button>

      {result === 'ok' && (
        <span className="flex items-center gap-1 text-xs text-[--color-success]">
          <Check size={13} strokeWidth={2.5} aria-hidden /> Comando enviado
        </span>
      )}
      {result === 'error' && (
        <span className="text-xs text-[--color-danger]">No se pudo enviar el comando</span>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-[--color-border] bg-[--color-bg-surface]/95 p-5 shadow-lg shadow-black/30 backdrop-blur-md">
            <div className="mb-1 flex items-center gap-2 text-[--color-warning]">
              <TriangleAlert size={16} strokeWidth={2} aria-hidden />
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
