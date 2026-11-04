import { hasRole, MAX_GEOFENCES_PER_VEHICLE, type Geofence, type LatLng } from '@securitycar/shared'
import { useRouter } from 'expo-router'
import { ChevronLeft, Circle as CircleIcon, Hexagon, Trash2 } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native'
import MapView, { Circle, Marker, Polygon, Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from '@/components/EmptyState'
import { Button, Card, Field } from '@/components/ui'
import { useVehicleContext } from '@/context/VehicleContext'
import { useGeofences, useVehicleStatus } from '@/hooks/useVehicles'
import { api } from '@/lib/api'
import { colors } from '@/theme/colors'

/** Sin slider nativo instalado: radios predefinidos cubren casa/trabajo/barrio. */
const RADII = [100, 200, 300, 500, 1000, 2000, 5000]

type Draft =
  | { shape: 'circle'; center: LatLng | null; radius_m: number }
  | { shape: 'polygon'; points: LatLng[] }

const toCoord = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng })

function formatRadius(m: number): string {
  return m >= 1000 ? `${m / 1000} km` : `${m} m`
}

export default function GeofencesScreen() {
  const router = useRouter()
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const { geofences, mutate } = useGeofences(selected?.id ?? null)
  const mapRef = useRef<MapView>(null)
  const centeredRef = useRef(false)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pos = status?.position

  // Igual que el mapa principal: solo initialRegion + animar al llegar la
  // posición real (mezclar region controlada deja la cámara pegada en Android).
  useEffect(() => {
    if (pos && !centeredRef.current) {
      centeredRef.current = true
      mapRef.current?.animateToRegion(
        { latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        400
      )
    }
  }, [pos])

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
        ? { shape, center: pos ? { lat: pos.lat, lng: pos.lng } : null, radius_m: 300 }
        : { shape, points: [] }
    )
  }

  function onMapPress(p: LatLng) {
    setDraft(d => {
      if (!d) return d
      if (d.shape === 'circle') return { ...d, center: p }
      return { ...d, points: [...d.points, p] }
    })
  }

  async function save() {
    if (!draft || !selected) return
    setSaving(true)
    setError(null)
    try {
      const geometry =
        draft.shape === 'circle'
          ? { center: draft.center, radius_m: draft.radius_m }
          : { points: draft.points }
      await api(`/api/vehicles/${selected.id}/geofences`, {
        method: 'POST',
        body: JSON.stringify({ name, shape: draft.shape, geometry }),
      })
      setDraft(null)
      mutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la geocerca')
    } finally {
      setSaving(false)
    }
  }

  async function toggle(f: Geofence, field: 'alert_on_enter' | 'alert_on_exit') {
    if (!selected) return
    mutate(geofences.map(g => (g.id === f.id ? { ...g, [field]: !f[field] } : g)), false)
    await api(`/api/vehicles/${selected.id}/geofences/${f.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: !f[field] }),
    }).catch(() => undefined)
    mutate()
  }

  function remove(f: Geofence) {
    Alert.alert('Eliminar geocerca', `¿Eliminar "${f.name}"? Dejarás de recibir sus alertas.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api(`/api/vehicles/${selected!.id}/geofences/${f.id}`, { method: 'DELETE' })
          mutate()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Geocercas · {selected.alias}</Text>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: -33.45, longitude: -70.66, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
          onPress={e =>
            onMapPress({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })
          }
        >
          {geofences.map(f =>
            f.shape === 'circle' ? (
              <Circle
                key={f.id}
                center={toCoord(f.geometry.center)}
                radius={f.geometry.radius_m}
                strokeColor={colors.accent}
                fillColor="rgba(154,176,85,0.18)"
                strokeWidth={2}
              />
            ) : (
              <Polygon
                key={f.id}
                coordinates={f.geometry.points.map(toCoord)}
                strokeColor={colors.accent}
                fillColor="rgba(154,176,85,0.18)"
                strokeWidth={2}
              />
            )
          )}

          {draft?.shape === 'circle' && draft.center && (
            <Circle
              center={toCoord(draft.center)}
              radius={draft.radius_m}
              strokeColor={colors.textPrimary}
              fillColor="rgba(250,250,247,0.15)"
              strokeWidth={2}
            />
          )}
          {draft?.shape === 'polygon' && draft.points.length >= 3 && (
            <Polygon
              coordinates={draft.points.map(toCoord)}
              strokeColor={colors.textPrimary}
              fillColor="rgba(250,250,247,0.15)"
              strokeWidth={2}
            />
          )}
          {draft?.shape === 'polygon' && draft.points.length === 2 && (
            <Polyline coordinates={draft.points.map(toCoord)} strokeColor={colors.textPrimary} strokeWidth={2} />
          )}
          {draft?.shape === 'polygon' &&
            draft.points.map((p, i) => (
              <Marker key={`v${i}`} coordinate={toCoord(p)} pinColor={colors.textPrimary} />
            ))}

          {pos && <Marker coordinate={toCoord({ lat: pos.lat, lng: pos.lng })} pinColor={colors.accent} />}
        </MapView>
        {draft && (
          <View style={styles.hintPill} pointerEvents="none">
            <Text style={styles.hintText}>
              {draft.shape === 'circle'
                ? 'Toca el mapa para ubicar el centro'
                : `Toca para agregar puntos (${draft.points.length})`}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {canEdit && !draft && (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Button label="Círculo" variant="secondary" icon={CircleIcon} disabled={atLimit} onPress={() => startDraft('circle')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="Polígono" variant="secondary" icon={Hexagon} disabled={atLimit} onPress={() => startDraft('polygon')} />
            </View>
          </View>
        )}
        {atLimit && !draft && (
          <Text style={styles.muted}>Llegaste al máximo de {MAX_GEOFENCES_PER_VEHICLE} geocercas.</Text>
        )}

        {draft && (
          <Card>
            <View style={{ gap: 12 }}>
              <Field label="Nombre" value={name} onChangeText={setName} placeholder="Casa, Trabajo…" maxLength={60} />
              {draft.shape === 'circle' ? (
                <View style={{ gap: 6 }}>
                  <Text style={styles.label}>Radio</Text>
                  <View style={styles.chips}>
                    {RADII.map(r => (
                      <Pressable
                        key={r}
                        onPress={() => setDraft({ ...draft, radius_m: r })}
                        style={[styles.chip, draft.radius_m === r && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, draft.radius_m === r && styles.chipTextActive]}>
                          {formatRadius(r)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.rowBetween}>
                  <Text style={styles.muted}>{draft.points.length} puntos · mínimo 3</Text>
                  {draft.points.length > 0 && (
                    <Text style={styles.link} onPress={() => setDraft({ ...draft, points: draft.points.slice(0, -1) })}>
                      Deshacer punto
                    </Text>
                  )}
                </View>
              )}
              <Text style={styles.muted}>Evita superponer zonas: si se cruzan, solo se avisa por una de ellas.</Text>
              {error && <Text style={styles.error}>{error}</Text>}
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancelar" variant="secondary" onPress={() => setDraft(null)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Guardar" loading={saving} disabled={!draftReady || name.trim() === ''} onPress={save} />
                </View>
              </View>
            </View>
          </Card>
        )}

        {geofences.length === 0 && !draft && (
          <Text style={styles.muted}>Aún no hay geocercas para este vehículo.</Text>
        )}
        {geofences.map(f => (
          <Card key={f.id}>
            <View style={{ gap: 10 }}>
              <View style={styles.rowBetween}>
                <View style={[styles.row, { flex: 1, alignItems: 'center' }]}>
                  {f.shape === 'circle' ? (
                    <CircleIcon size={16} color={colors.accent} />
                  ) : (
                    <Hexagon size={16} color={colors.accent} />
                  )}
                  <Text style={styles.fenceName} numberOfLines={1}>
                    {f.name}
                    {f.shape === 'circle' && <Text style={styles.muted}>  {formatRadius(f.geometry.radius_m)}</Text>}
                  </Text>
                </View>
                {canEdit && (
                  <Pressable onPress={() => remove(f)} hitSlop={10}>
                    <Trash2 size={18} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
              {(['alert_on_enter', 'alert_on_exit'] as const).map(field => (
                <View key={field} style={styles.rowBetween}>
                  <Text style={styles.switchLabel}>
                    {field === 'alert_on_enter' ? 'Avisar al entrar' : 'Avisar al salir'}
                  </Text>
                  <Switch
                    value={f[field]}
                    disabled={!canEdit}
                    onValueChange={() => toggle(f, field)}
                    trackColor={{ true: colors.accent, false: colors.border }}
                    thumbColor={colors.textPrimary}
                  />
                </View>
              ))}
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  mapWrap: { height: 300 },
  hintPill: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  hintText: { color: colors.textSecondary, fontSize: 12 },
  content: { padding: 16, gap: 12 },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.danger, fontSize: 13 },
  link: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.onAccent },
  fenceName: { color: colors.textPrimary, fontWeight: '600', flexShrink: 1 },
  switchLabel: { color: colors.textSecondary, fontSize: 13 },
})
