'use client'

import type { LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'

interface Props {
  label: string
  icon: LucideIcon
  variant: 'danger' | 'success'
  loading: boolean
  onConfirm: () => void
}

const THUMB_SIZE = 46
const TRACK_PADDING = 4
const THRESHOLD = 0.78

/**
 * Control deslizante para confirmar una acción física irreversible (bloquear
 * el motor, p. ej.) sin un paso extra de modal — el propio gesto es la
 * confirmación. Requiere recorrer el 78% de la pista para disparar; si se
 * suelta antes, el pulgar vuelve al inicio.
 *
 * Accesible por teclado: al enfocar el pulgar, Enter/Espacio confirma
 * directamente — pedir el gesto de arrastre por teclado no es viable.
 */
export function SlideToConfirm({ label, icon: Icon, variant, loading, onConfirm }: Props) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const maxDragRef = useRef(0)

  const color = variant === 'danger' ? 'var(--color-danger)' : 'var(--color-success)'

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (loading) return
    const track = trackRef.current
    if (!track) return
    maxDragRef.current = track.clientWidth - THUMB_SIZE - TRACK_PADDING * 2
    startXRef.current = e.clientX - dragX
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const delta = e.clientX - startXRef.current
    setDragX(Math.min(Math.max(delta, 0), maxDragRef.current))
  }

  function onPointerUp() {
    if (!dragging) return
    setDragging(false)
    if (maxDragRef.current > 0 && dragX >= maxDragRef.current * THRESHOLD) {
      onConfirm()
    } else {
      setDragX(0)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ' ') && !loading) {
      e.preventDefault()
      onConfirm()
    }
  }

  return (
    <div
      ref={trackRef}
      className="relative flex h-[54px] items-center overflow-hidden rounded-full border border-(--color-border) bg-(--color-bg-elevated)"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0"
        style={{
          width: `${dragX + THUMB_SIZE + TRACK_PADDING}px`,
          background: `color-mix(in srgb, ${color} 18%, transparent)`,
          transition: dragging ? 'none' : 'width 0.25s ease-out',
        }}
      />
      <span className="pointer-events-none relative z-0 w-full select-none text-center text-sm font-semibold text-(--color-text-secondary)">
        {loading ? 'Enviando…' : `Desliza para ${label.toLowerCase()}`}
      </span>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${label}. Desliza para confirmar, o presiona Enter.`}
        aria-disabled={loading}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="absolute z-10 flex cursor-grab touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-(--color-text-primary) active:cursor-grabbing"
        style={{
          left: TRACK_PADDING,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          backgroundColor: color,
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.25s ease-out',
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Icon size={18} strokeWidth={2} color="#fff" aria-hidden />
      </div>
    </div>
  )
}
