import { useRouter } from 'expo-router'
import { Car, TriangleAlert } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/ui'
import { useVehicleContext } from '@/context/VehicleContext'
import { colors } from '@/theme/colors'

export function EmptyState() {
  const router = useRouter()
  const { error } = useVehicleContext()

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: colors.danger + '1A' }]}>
          <TriangleAlert size={28} strokeWidth={1.75} color={colors.danger} />
        </View>
        <Text style={styles.title}>No se pudieron cargar tus vehículos</Text>
        <Text style={styles.body}>Revisa tu conexión e intenta de nuevo.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Car size={28} strokeWidth={1.75} color={colors.accent} />
      </View>
      <Text style={styles.title}>Aún no tienes vehículos</Text>
      <Text style={styles.body}>
        Agrega tu primer vehículo con el código de activación que viene con tu equipo GPS.
      </Text>
      <Button label="Agregar vehículo" onPress={() => router.push('/settings')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: colors.bgBase,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  body: { color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
})
