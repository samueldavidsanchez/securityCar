import type { TripSummary } from '@securitycar/shared'
import { formatDistance, formatDuration } from '@securitycar/shared'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
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

export default function History() {
  const { selected } = useVehicleContext()
  const { data: trips, isLoading } = useSWR<TripSummary[]>(
    selected ? `/api/vehicles/${selected.id}/trips` : null,
    fetcher
  )

  if (!selected) return <EmptyState />

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <VehiclePills />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.subtitle}>Últimos viajes · {selected.alias}</Text>

        {isLoading && <Text style={styles.muted}>Cargando viajes…</Text>}
        {!isLoading && (!trips || trips.length === 0) && (
          <Card>
            <Text style={styles.muted}>No hay viajes en los últimos 7 días.</Text>
          </Card>
        )}

        {trips?.map(trip => (
          <Card key={trip.id}>
            <View style={styles.row}>
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
              </View>
            </View>
          </Card>
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
  muted: { color: colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metrics: { flexDirection: 'row', gap: 16 },
  tripTime: { color: colors.textPrimary, fontWeight: '600', fontSize: 14 },
  metric: { color: colors.textPrimary, fontWeight: '700' },
  metricAccent: { color: colors.accent, fontWeight: '700' },
  metricLabel: { color: colors.textMuted, fontSize: 11 },
})
