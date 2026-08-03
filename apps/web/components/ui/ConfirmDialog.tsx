'use client'

import { TriangleAlert } from 'lucide-react'
import { Button } from './Button'

interface Props {
  open: boolean
  description: string
  confirmLabel?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Overlay de confirmación genérico — extraído de `CommandButton` (donde vivía
 * inline) para reusarlo en el panel admin (revocar acceso, retirar
 * dispositivo, regenerar código). Mismo markup/estilo que ya tenía
 * `CommandButton`, sin cambios visuales.
 */
export function ConfirmDialog({
  open,
  description,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="shadow-floating w-full max-w-sm rounded-2xl border border-(--color-border) bg-(--color-bg-surface)/95 p-5 backdrop-blur-md">
        <div className="mb-1 flex items-center gap-2 text-(--color-warning)">
          <TriangleAlert size={16} strokeWidth={2} aria-hidden />
          <span className="text-sm font-semibold">Confirmar acción</span>
        </div>
        <p className="mb-4 text-sm text-(--color-text-secondary)">{description}</p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant={variant} className="flex-1" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
