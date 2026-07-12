import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card, Field } from '@/components/ui'
import { useVehicleContext } from '@/context/VehicleContext'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

export default function Settings() {
  const router = useRouter()
  const { vehicles, mutate } = useVehicleContext()
  const [alias, setAlias] = useState('')
  const [deviceId, setDeviceId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function addVehicle() {
    setError(null)
    setLoading(true)
    try {
      await api('/api/vehicles', {
        method: 'POST',
        body: JSON.stringify({ alias, flespi_device_id: Number(deviceId) }),
      })
      setAlias('')
      setDeviceId('')
      mutate()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el vehículo')
    } finally {
      setLoading(false)
    }
  }

  function removeVehicle(id: string, name: string) {
    Alert.alert('Eliminar vehículo', `¿Eliminar "${name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await api(`/api/vehicles/${id}`, { method: 'DELETE' })
          mutate()
        },
      },
    ])
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Configuración</Text>

        <Card>
          <View style={{ gap: 12 }}>
            <Text style={styles.section}>Agregar vehículo</Text>
            <Field label="Alias" value={alias} onChangeText={setAlias} placeholder="Mi Corolla" />
            <Field
              label="ID de dispositivo Flespi"
              value={deviceId}
              onChangeText={setDeviceId}
              keyboardType="number-pad"
              placeholder="123456"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="Agregar" onPress={addVehicle} loading={loading} />
          </View>
        </Card>

        <Card>
          <View style={{ gap: 10 }}>
            <Text style={styles.section}>Mis vehículos</Text>
            {vehicles.length === 0 && <Text style={styles.muted}>Aún no tienes vehículos.</Text>}
            {vehicles.map(v => (
              <View key={v.id} style={styles.vehicleRow}>
                <View>
                  <Text style={styles.vehicleName}>{v.alias}</Text>
                  <Text style={styles.muted}>Dispositivo #{v.flespi_device_id}</Text>
                </View>
                <Text style={styles.remove} onPress={() => removeVehicle(v.id, v.alias)}>
                  Eliminar
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  section: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  muted: { color: colors.textMuted, fontSize: 13 },
  error: { color: colors.danger, fontSize: 13 },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgElevated,
    borderRadius: 12,
    padding: 12,
  },
  vehicleName: { color: colors.textPrimary, fontWeight: '600' },
  remove: { color: colors.danger, fontSize: 13, fontWeight: '600' },
})
