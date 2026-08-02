import { isOnline } from '@securitycar/shared'
import { LocateFixed } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { VehicleSheet } from '@/components/map/VehicleSheet'
import { EmptyState } from '@/components/EmptyState'
import { useVehicleContext } from '@/context/VehicleContext'
import { useNow } from '@/hooks/useNow'
import { useVehicleStatus, useVehicleTrips } from '@/hooks/useVehicles'
import { colors } from '@/theme/colors'

export default function MapScreen() {
  const { selected } = useVehicleContext()
  const { status } = useVehicleStatus(selected?.id ?? null)
  const { trips } = useVehicleTrips(selected?.id ?? null)
  const now = useNow()
  const mapRef = useRef<MapView>(null)
  const hasCenteredRef = useRef(false)
  const insets = useSafeAreaInsets()

  const pos = status?.position

  // `region` (controlled) y `initialRegion` (no controlado) no se llevan bien
  // en react-native-maps -- mezclarlos deja la cámara pegada en initialRegion
  // en Android aunque el marcador sí se dibuje en la posición real, así que
  // el mapa "carga" pero el pin queda fuera de cámara. En vez de eso: solo
  // initialRegion para el arranque, y animamos a la posición real la primera
  // vez que llega (y cada vez que se toca "centrar").
  useEffect(() => {
    if (pos && !hasCenteredRef.current) {
      hasCenteredRef.current = true
      mapRef.current?.animateToRegion(
        { latitude: pos.lat, longitude: pos.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        500
      )
    }
  }, [pos])

  if (!selected) return <EmptyState />

  const online = isOnline(status?.last_seen ?? null, now)

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
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: 19.4326, longitude: -99.1332, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
      >
        {pos && (
          <Marker
            key={selected.id}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }}
            title={selected.alias}
            pinColor={colors.accent}
          />
        )}
      </MapView>

      <Pressable
        style={({ pressed }) => [
          styles.recenter,
          { top: insets.top + 16, transform: [{ scale: pressed ? 0.96 : 1 }] },
        ]}
        onPress={recenter}
      >
        <LocateFixed size={18} color={colors.textPrimary} />
      </Pressable>

      <VehicleSheet
        alias={selected.alias}
        online={online}
        speed={status?.speed ?? null}
        lastSeen={status?.last_seen ?? null}
        batteryVoltage={status?.battery_voltage ?? null}
        ignition={status?.ignition ?? null}
        trips={trips}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  recenter: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
})
