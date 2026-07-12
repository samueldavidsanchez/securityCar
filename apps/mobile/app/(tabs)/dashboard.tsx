import { formatRelativeTime, formatSpeed, formatVoltage, isOnline } from '@securitycar/shared'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Card, Stat } from '@/components/ui'
import { EmptyState } from '@/components/EmptyState'
import { VehiclePills } from '@/components/VehiclePills'
import { useVehicleContext } from '@/context/VehicleContext'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus } from '@/hooks/useVehicles'
import { colors } from '@/theme/colors'

export default function Dashboard() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const now = useNow()

  if (!selected) return <EmptyState />
  const online = isOnline(status?.last_seen ?? null, now)

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

        <View style={styles.grid}>
          <Card style={styles.gridItem}>
            <Stat
              label="Motor"
              value={status?.engine_blocked ? 'Bloqueado' : 'Normal'}
              accent={status?.engine_blocked ?? false}
            />
          </Card>
          <Card style={styles.gridItem}>
            <Stat
              label="Ignición"
              value={status?.ignition == null ? '—' : status.ignition ? 'Encendido' : 'Apagado'}
            />
          </Card>
          <Card style={styles.gridItem}>
            <Stat label="Velocidad" value={formatSpeed(status?.speed ?? null)} />
          </Card>
          <Card style={styles.gridItem}>
            <Stat label="Batería GPS" value={formatVoltage(status?.battery_voltage ?? null)} />
          </Card>
        </View>

        <Card>
          <Stat label="Última conexión" value={formatRelativeTime(status?.last_seen ?? null)} />
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { flexBasis: '47%', flexGrow: 1 },
})
