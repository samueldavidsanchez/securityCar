'use client'

import { hasRole, MAX_GEOFENCES_PER_VEHICLE, type Geofence, type LatLng } from '@securitycar/shared'
import { Circle, Hexagon, Trash2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useState } from 'react'
import { useVehicleContext } from '@/components/VehicleProvider'
import type { GeofenceDraft } from '@/components/map/GeofenceMap'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/vehicle/EmptyState'
import { useGeofences } from '@/hooks/useGeofences'
import { useVehicleStatus } from '@/hooks/useVehicles'

// MapLibre touches `window` — load client-only.
const GeofenceMap = dynamic(
  () => import('@/components/map/GeofenceMap').then(m => m.GeofenceMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-(--color-bg-surface)" /> }
)

const DEFAULT_RADIUS_M = 300

function formatRadius(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

export default function GeofencesPage() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const { geofences, mutate } = useGeofences(selected?.id ?? null)

  const [draft, setDraft] = useState<GeofenceDraft | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Geofence | null>(null)

  const onMapClick = useCallback((p: LatLng) => {
    setDraft(d => {
      if (!d) return d
      if (d.shape === 'circle') return { ...d, center: p }
      return { ...d, points: [...d.points, p] }
    })
  }, [])

  if (!selected) return <EmptyState />

  const canEdit = hasRole(selected.effective_role, 'driver')
  const atLimit = geofences.length >= MAX_GEOFENCES_PER_VEHICLE
  const draftReady =
    draft !== null && (draft.shape === 'circle' ? draft.center !== null : draft.points.length >= 3)

  function startDraft(shape: 'circle' | 'polygon') {
    setError(null)
    setName('')
    setDraft(
      shape === 'circle'
        ? { shape, center: status?.position ? { lat: status.position.lat, lng: status.position.lng } : null, radius_m: DEFAULT_RADIUS_M }
        : { shape, points: [] }
    )
  }

  async function save() {
    if (!draft || !selected) return
    setSaving(true)
    setError(null)
    const geometry =
      draft.shape === 'circle'
        ? { center: draft.center, radius_m: draft.radius_m }
        : { points: draft.points }
    const res = await fetch(`/api/vehicles/${selected.id}/geofences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, shape: draft.shape, geometry }),
    })
    const json = await res.json().catch(() => null)
    setSaving(false)
    if (!res.ok) {
      setError(json?.error ?? 'No se pudo guardar la geocerca')
      return
    }
    setDraft(null)
    mutate()
  }

  async function toggle(f: Geofence, field: 'alert_on_enter' | 'alert_on_exit') {
    if (!selected) return
    // Optimista: el switch responde al instante y SWR revalida después.
    mutate(geofences.map(g => (g.id === f.id ? { ...g, [field]: !f[field] } : g)), false)
    await fetch(`/api/vehicles/${selected.id}/geofences/${f.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: !f[field] }),
    })
    mutate()
  }

  async function remove() {
    if (!deleting || !selected) return
    await fetch(`/api/vehicles/${selected.id}/geofences/${deleting.id}`, { method: 'DELETE' })
    setDeleting(null)
    mutate()
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <div className="relative h-[45vh] min-w-0 shrink-0 md:h-full md:flex-1">
        <GeofenceMap
          position={status?.position ?? null}
          geofences={geofences}
          draft={draft}
          onMapClick={onMapClick}
        />
        {draft && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="rounded-full bg-(--color-bg-surface)/90 px-3 py-1.5 text-xs text-(--color-text-secondary) shadow-lg backdrop-blur">
              {draft.shape === 'circle'
                ? 'Haz clic en el mapa para ubicar el centro'
                : `Haz clic para agregar puntos (${draft.points.length})`}
            </span>
          </div>
        )}
      </div>

      <aside className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:w-96 md:flex-none md:border-l md:border-(--color-border)">
        <div>
          <h1 className="text-xl font-semibold">Geocercas</h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Te avisamos en el celular cuando {selected.alias} entra o sale de una zona.
          </p>
        </div>

        {canEdit && !draft && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" disabled={atLimit} onClick={() => startDraft('circle')}>
              <Circle size={16} /> Círculo
            </Button>
            <Button variant="secondary" disabled={atLimit} onClick={() => startDraft('polygon')}>
              <Hexagon size={16} /> Polígono
            </Button>
          </div>
        )}
        {atLimit && !draft && (
          <p className="text-xs text-(--color-text-muted)">
            Llegaste al máximo de {MAX_GEOFENCES_PER_VEHICLE} geocercas.
          </p>
        )}

        {draft && (
          <Card className="flex flex-col gap-3">
            <Input
              id="geofence-name"
              label="Nombre"
              placeholder="Casa, Trabajo…"
              maxLength={60}
              value={name}
              onChange={e => setName(e.target.value)}
            />
            {draft.shape === 'circle' ? (
              <label className="flex flex-col gap-1.5 text-sm font-medium text-(--color-text-secondary)">
                Radio: {formatRadius(draft.radius_m)}
                <input
                  type="range"
                  min={50}
                  max={5000}
                  step={50}
                  value={draft.radius_m}
                  onChange={e => setDraft({ ...draft, radius_m: Number(e.target.value) })}
                  className="accent-(--color-accent)"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between text-xs text-(--color-text-muted)">
                <span>{draft.points.length} puntos · mínimo 3</span>
                {draft.points.length > 0 && (
                  <button
                    className="text-(--color-accent) hover:underline"
                    onClick={() => setDraft({ ...draft, points: draft.points.slice(0, -1) })}
                  >
                    Deshacer punto
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-(--color-text-muted)">
              Evita superponer zonas: si se cruzan, solo se avisa por una de ellas.
            </p>
            {error && <p className="text-sm text-(--color-danger)">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
              <Button loading={saving} disabled={!draftReady || name.trim() === ''} onClick={save}>
                Guardar
              </Button>
            </div>
          </Card>
        )}

        <div className="flex flex-col gap-2">
          {geofences.length === 0 && !draft && (
            <p className="text-sm text-(--color-text-muted)">Aún no hay geocercas para este vehículo.</p>
          )}
          {geofences.map(f => (
            <Card key={f.id} className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {f.shape === 'circle' ? (
                    <Circle size={16} className="shrink-0 text-(--color-accent)" />
                  ) : (
                    <Hexagon size={16} className="shrink-0 text-(--color-accent)" />
                  )}
                  <span className="truncate text-sm font-medium">{f.name}</span>
                  {f.shape === 'circle' && (
                    <span className="text-xs text-(--color-text-muted)">{formatRadius(f.geometry.radius_m)}</span>
                  )}
                </div>
                {canEdit && (
                  <button
                    aria-label={`Eliminar ${f.name}`}
                    onClick={() => setDeleting(f)}
                    className="rounded-lg p-1.5 text-(--color-text-muted) hover:bg-(--color-bg-elevated) hover:text-(--color-danger)"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="flex gap-4 text-xs text-(--color-text-secondary)">
                {(['alert_on_enter', 'alert_on_exit'] as const).map(field => (
                  <label key={field} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={f[field]}
                      disabled={!canEdit}
                      onChange={() => toggle(f, field)}
                      className="accent-(--color-accent)"
                    />
                    {field === 'alert_on_enter' ? 'Avisar al entrar' : 'Avisar al salir'}
                  </label>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </aside>

      <ConfirmDialog
        open={deleting !== null}
        description={`¿Eliminar la geocerca "${deleting?.name ?? ''}"? Dejarás de recibir sus alertas.`}
        confirmLabel="Eliminar"
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
