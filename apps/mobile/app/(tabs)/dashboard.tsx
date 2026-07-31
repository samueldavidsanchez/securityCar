import type { TripSummary } from '@securitycar/shared'
import {
  formatEngineHours,
  formatOdometer,
  formatRelativeTime,
  formatRpm,
  formatSpeed,
  formatTemperature,
  formatVoltage,
  isOnline,
} from '@securitycar/shared'
import { BatteryMedium, Clock, Gauge, KeyRound, Thermometer, Wrench } from 'lucide-react-native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Stat } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { VehiclePills } from '@/components/VehiclePills'
import { useVehicleContext } from '@/context/VehicleContext'
import { useNow } from '@/hooks/useNow'
import { useVehicleTelemetry, useVehicleTrips } from '@/hooks/useVehicles'
import { colors } from '@/theme/colors'

const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

/** Distancia por día, últimos 7 días (hoy incluido), más reciente al final. */
function weeklyDistanceBuckets(trips: TripSummary[]): { label: string; km: number }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today)
    day.setDate(day.getDate() - (6 - i))
    return { day, label: WEEKDAY_LETTERS[day.getDay()], km: 0 }
  })

  for (const trip of trips) {
    if (!trip.started_at) continue
    const started = new Date(trip.started_at)
    started.setHours(0, 0, 0, 0)
    const bucket = days.find(d => d.day.getTime() === started.getTime())
    if (bucket) bucket.km += trip.distance_km
  }

  return days.map(({ label, km }) => ({ label, km }))
}

export default function Dashboard() {
  const { selected } = useVehicleContext()
  const { telemetry } = useVehicleTelemetry(selected?.id ?? null)
  const { trips } = useVehicleTrips(selected?.id ?? null)
  const now = useNow()

  if (!selected) return <EmptyState />
  const online = isOnline(telemetry?.timestamp ?? null, now)
  const buckets = weeklyDistanceBuckets(trips)
  const maxKm = Math.max(...buckets.map(b => b.km), 1)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <VehiclePills />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{selected.alias}</Text>
          <View style={[styles.badge, { backgroundColor: (online ? colors.success : colors.textMuted) + '26' }]}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
            <Text style={[styles.badgeText, { color: online ? colors.success : colors.textMuted }]}>
              {online ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Ahora</Text>
        <View style={styles.grid}>
          <Card style={styles.gridItem}>
            <Stat
              label="Ignición"
              value={telemetry?.ignition == null ? '—' : telemetry.ignition ? 'Encendido' : 'Apagado'}
              icon={KeyRound}
            />
          </Card>
          <Card style={styles.gridItem}>
            <Stat label="Velocidad" value={formatSpeed(telemetry?.speed ?? null)} icon={Gauge} />
          </Card>
          <Card style={styles.gridItem}>
            <Stat label="Batería GPS" value={formatVoltage(telemetry?.battery_voltage ?? null)} icon={BatteryMedium} />
          </Card>
          <Card style={styles.gridItem}>
            <Stat label="Temp. motor" value={formatTemperature(telemetry?.temperature ?? null)} icon={Thermometer} />
          </Card>
        </View>

        <Card style={styles.row}>
          <View style={styles.rowLabel}>
            <Wrench size={16} strokeWidth={2} color={colors.textPrimary} />
            <Text style={styles.rowLabelText}>Estado del motor</Text>
          </View>
          <Text style={[styles.rowValue, { color: telemetry?.engine_blocked ? colors.danger : colors.success }]}>
            {telemetry?.engine_blocked ? 'Bloqueado' : 'Normal'}
          </Text>
        </Card>

        <Text style={styles.sectionLabel}>Acumulados</Text>
        <View style={styles.grid}>
          <View style={[styles.accumCard, styles.gridItem]}>
            <Stat label="Odómetro" value={formatOdometer(telemetry?.odometer ?? null)} />
          </View>
          <View style={[styles.accumCard, styles.gridItem]}>
            <Stat label="Horas de motor" value={formatEngineHours(telemetry?.engine_hours ?? null)} />
          </View>
        </View>
        {telemetry?.rpm != null && (
          <Card>
            <Stat label="RPM" value={formatRpm(telemetry.rpm)} />
          </Card>
        )}

        <Text style={styles.sectionLabel}>Distancia · últimos 7 días</Text>
        <Card style={{ gap: 10 }}>
          <View style={styles.sparkRow}>
            {buckets.map((b, i) => (
              <View
                key={i}
                style={[
                  styles.sparkBar,
                  {
                    height: Math.max((b.km / maxKm) * 56, 3),
                    backgroundColor: i === 6 ? colors.accent : colors.accent + 'A6',
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.sparkLabelsRow}>
            {buckets.map((b, i) => (
              <Text key={i} style={styles.sparkLabel}>
                {b.label}
              </Text>
            ))}
          </View>
        </Card>

        <Card>
          <Stat label="Última conexión" value={formatRelativeTime(telemetry?.timestamp ?? null)} icon={Clock} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sectionLabel: { fontSize: 11.5, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexBasis: '47%', flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabelText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowValue: { fontSize: 14, fontWeight: '700' },
  accumCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sparkRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 56 },
  sparkLabelsRow: { flexDirection: 'row', gap: 6 },
  sparkBar: { flex: 1, borderRadius: 4, minHeight: 3 },
  sparkLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: colors.textMuted },
})
