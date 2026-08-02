import type { GpsPosition, TripSummary, VehicleEvent } from '@securitycar/shared'
import { EVENT_LABEL, formatDistance, formatDuration } from '@securitycar/shared'
import { ChevronDown } from 'lucide-react-native'
import { useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import useSWR from 'swr'
import { Card } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { VehiclePills } from '@/components/VehiclePills'
import { useVehicleContext } from '@/context/VehicleContext'
import { fetcher } from '@/lib/api'
import { colors } from '@/theme/colors'

function fmt(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function epoch(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000)
}

/** Mapa embebido que dibuja la ruta del viaje y encuadra sus puntos. */
function TripRouteMap({ route }: { route: GpsPosition[] }) {
  const mapRef = useRef<MapView>(null)
  const coords = route.map(p => ({ latitude: p.lat, longitude: p.lng }))

  function fitRoute() {
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 32, right: 32, bottom: 32, left: 32 },
      animated: false,
    })
  }

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={styles.routeMap}
      onMapReady={fitRoute}
      toolbarEnabled={false}
    >
      <Polyline coordinates={coords} strokeColor={colors.accent} strokeWidth={4} />
      <Marker coordinate={coords[0]} title="Inicio" pinColor={colors.accent} />
      <Marker coordinate={coords[coords.length - 1]} title="Fin" pinColor="#1D1D1B" />
    </MapView>
  )
}

interface TripCardProps {
  vehicleId: string
  trip: TripSummary
  open: boolean
  onToggle: () => void
}

function TripCard({ vehicleId, trip, open, onToggle }: TripCardProps) {
  // Solo pide la ruta cuando la tarjeta está abierta (mismo patrón que la web).
  const { data: route, isLoading } = useSWR<GpsPosition[]>(
    open
      ? `/api/vehicles/${vehicleId}/trips/path?from=${epoch(trip.started_at)}&to=${epoch(trip.ended_at)}`
      : null,
    fetcher
  )

  return (
    <Card>
      <Pressable onPress={onToggle} style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tripTime}>{fmt(trip.started_at)}</Text>
          <Text style={styles.muted}>→ {fmt(trip.ended_at)}</Text>
        </View>
        <View style={styles.metrics}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metricAccent}>{formatDistance(trip.distance_km)}</Text>
            <Text style={styles.metricLabel}>distancia</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metric}>{formatDuration(trip.duration_seconds)}</Text>
            <Text style={styles.metricLabel}>duración</Text>
          </View>
          <ChevronDown
            size={16}
            color={colors.textMuted}
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </View>
      </Pressable>

      {open && (
        <View style={styles.routeBox}>
          {isLoading && <Text style={styles.routeMsg}>Cargando ruta…</Text>}
          {!isLoading && (!route || route.length === 0) && (
            <Text style={styles.routeMsg}>Sin puntos GPS para este viaje.</Text>
          )}
          {!isLoading && route && route.length > 0 && <TripRouteMap route={route} />}
        </View>
      )}
    </Card>
  )
}

export default function History() {
  const { selected } = useVehicleContext()
  const [openId, setOpenId] = useState<string | null>(null)
  const {
    data: trips,
    isLoading,
    error: tripsError,
  } = useSWR<TripSummary[]>(selected ? `/api/vehicles/${selected.id}/trips` : null, fetcher)
  const { data: events } = useSWR<VehicleEvent[]>(
    selected ? `/api/vehicles/${selected.id}/events` : null,
    fetcher
  )

  if (!selected) return <EmptyState />

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <VehiclePills />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>Últimos viajes · {selected.alias}</Text>

        {events && events.length > 0 && (
          <>
            <Text style={styles.section}>Eventos recientes</Text>
            {events.slice(0, 10).map(ev => (
              <Card key={ev.id}>
                <View style={styles.row}>
                  <Text style={styles.tripTime}>{EVENT_LABEL[ev.event_type]}</Text>
                  <Text style={styles.muted}>{fmt(ev.occurred_at)}</Text>
                </View>
              </Card>
            ))}
            <Text style={styles.section}>Viajes</Text>
          </>
        )}

        {isLoading && <Text style={styles.muted}>Cargando viajes…</Text>}
        {tripsError && (
          <Card>
            <Text style={styles.error}>No se pudieron cargar los viajes: {tripsError.message}</Text>
          </Card>
        )}
        {!isLoading && !tripsError && (!trips || trips.length === 0) && (
          <Card>
            <Text style={styles.muted}>No hay viajes en los últimos 7 días.</Text>
          </Card>
        )}

        {trips?.map(trip => (
          <TripCard
            key={trip.id}
            vehicleId={selected.id}
            trip={trip}
            open={openId === trip.id}
            onToggle={() => setOpenId(openId === trip.id ? null : trip.id)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textMuted, marginTop: -6, marginBottom: 4 },
  section: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  tripTime: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  metric: { color: colors.textPrimary, fontWeight: '700' },
  metricAccent: { color: colors.accent, fontWeight: '700' },
  metricLabel: { color: colors.textMuted, fontSize: 11 },
  routeBox: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  routeMsg: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
  routeMap: { height: 240, borderRadius: 12, overflow: 'hidden' },
})
