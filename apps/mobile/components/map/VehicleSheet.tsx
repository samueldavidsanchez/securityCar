import type { TripSummary } from '@securitycar/shared'
import { formatDistance, formatDuration, formatRelativeTime, formatSpeed, formatVoltage } from '@securitycar/shared'
import { useRouter } from 'expo-router'
import { BatteryMedium, ChevronUp, KeyRound } from 'lucide-react-native'
import { useState } from 'react'
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native'
import { colors } from '@/theme/colors'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

interface Props {
  alias: string
  online: boolean
  speed: number | null
  lastSeen: string | null
  batteryVoltage: number | null
  ignition: boolean | null
  trips: TripSummary[]
}

function formatTripWhen(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Panel flotante inferior sobre el mapa. Espejo del componente web
 * equivalente: colapsado muestra alias/estado/velocidad; expandido suma
 * batería/ignición y los últimos viajes.
 */
export function VehicleSheet({ alias, online, speed, lastSeen, batteryVoltage, ignition, trips }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const recentTrips = trips.slice(0, 3)

  function toggle() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(e => !e)
  }

  return (
    <View style={styles.sheet}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.header}
      >
        <View style={styles.handle} />
        <View style={styles.headerRow}>
          <View>
            <View style={styles.aliasRow}>
              <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
              <Text style={styles.alias}>{alias}</Text>
            </View>
            <Text style={styles.sub}>
              {formatSpeed(speed)} · {formatRelativeTime(lastSeen)}
            </Text>
          </View>
          <ChevronUp
            size={18}
            color={colors.textMuted}
            style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}
          />
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.body}>
          <View style={styles.grid}>
            <View style={styles.statCard}>
              <View style={styles.statLabelRow}>
                <BatteryMedium size={14} color={colors.textMuted} />
                <Text style={styles.statLabel}>Batería</Text>
              </View>
              <Text style={styles.statValue}>{formatVoltage(batteryVoltage)}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statLabelRow}>
                <KeyRound size={14} color={colors.textMuted} />
                <Text style={styles.statLabel}>Ignición</Text>
              </View>
              <Text style={styles.statValue}>
                {ignition == null ? '—' : ignition ? 'Encendido' : 'Apagado'}
              </Text>
            </View>
          </View>

          <View style={styles.tripsHeader}>
            <Text style={styles.tripsLabel}>Viajes recientes</Text>
            <Pressable onPress={() => router.push('/history')}>
              <Text style={styles.tripsLink}>Ver todos</Text>
            </Pressable>
          </View>

          {recentTrips.length === 0 && (
            <Text style={styles.emptyTrips}>Sin viajes en los últimos 7 días.</Text>
          )}
          {recentTrips.map((trip, i) => (
            <View key={trip.id} style={[styles.tripRow, i === 0 && styles.tripRowFirst]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.tripWhen}>{formatTripWhen(trip.started_at)}</Text>
                <Text style={styles.tripMeta}>{formatDuration(trip.duration_seconds)}</Text>
              </View>
              <Text style={styles.tripDist}>{formatDistance(trip.distance_km)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgSurface + 'EB',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '78%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 14,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 999, backgroundColor: colors.border, alignSelf: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aliasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  alias: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  body: { paddingHorizontal: 16, paddingBottom: 20, gap: 12 },
  grid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { fontSize: 10.5, color: colors.textMuted },
  statValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  tripsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tripsLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.textMuted },
  tripsLink: { fontSize: 12, fontWeight: '600', color: colors.accent },
  emptyTrips: { fontSize: 12, color: colors.textMuted, paddingVertical: 6 },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tripRowFirst: { borderTopWidth: 0 },
  tripWhen: { fontSize: 12.5, fontWeight: '600', color: colors.textPrimary },
  tripMeta: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  tripDist: { fontSize: 13, fontWeight: '700', color: colors.accent },
})
