import { formatRelativeTime, formatSpeed, isOnline } from '@securitycar/shared'
import { useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EmptyState } from '@/components/EmptyState'
import { useVehicleContext } from '@/context/VehicleContext'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus } from '@/hooks/useVehicles'
import { colors } from '@/theme/colors'

export default function MapScreen() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const now = useNow()
  const mapRef = useRef<MapView>(null)

  if (!selected) return <EmptyState />

  const pos = status?.position
  const online = isOnline(status?.last_seen ?? null, now)
  const region: Region | undefined = pos
    ? { latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : undefined

  function recenter() {
    if (pos) {
      mapRef.current?.animateToRegion(
        { latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      )
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        region={region}
        initialRegion={{ latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
      >
        {pos && (
          <Marker
            coordinate={{ latitude: pos.lat, longitude: pos.lng }}
            title={selected.alias}
            pinColor={colors.accent}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.dot, { backgroundColor: online ? colors.success : colors.textMuted }]} />
            <Text style={styles.cardTitle}>{selected.alias}</Text>
          </View>
          <Text style={styles.cardSub}>
            {formatSpeed(status?.speed ?? null)} · {formatRelativeTime(status?.last_seen ?? null)}
          </Text>
        </View>
      </SafeAreaView>

      <Pressable style={styles.recenter} onPress={recenter}>
        <Text style={styles.recenterText}>🎯 Centrar</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: 12 },
  card: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgSurface + 'F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { color: colors.textPrimary, fontWeight: '700', fontSize: 15 },
  cardSub: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  recenter: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    backgroundColor: colors.bgSurface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  recenterText: { color: colors.textPrimary, fontWeight: '600' },
})
