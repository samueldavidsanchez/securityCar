import { ROLE_LABEL } from '@securitycar/shared'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Card, Field } from '@/components/ui'
import { useVehicleContext } from '@/context/VehicleContext'
import { api } from '@/lib/api'
import { signOutGoogle } from '@/lib/google-auth'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

export default function Settings() {
  const router = useRouter()
  const { vehicles, mutate } = useVehicleContext()
  const [alias, setAlias] = useState('')
  const [claimCode, setClaimCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function addVehicle() {
    setError(null)
    setLoading(true)
    try {
      const res = await api<{ has_signal: boolean | null }>('/api/vehicles', {
        method: 'POST',
        body: JSON.stringify({ alias, claim_code: claimCode }),
      })
      setAlias('')
      setClaimCode('')
      mutate()
      if (res.has_signal === false) {
        Alert.alert(
          'Vehículo agregado',
          'El equipo aún no reporta señal; puede tardar unos minutos tras la instalación.'
        )
      }
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
    // Sin cerrar también la sesión de Google, el siguiente "Continuar con
    // Google" reentra en silencio con la misma cuenta y no deja cambiar de
    // usuario.
    await signOutGoogle()
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
              label="Código de activación"
              value={claimCode}
              onChangeText={t => setClaimCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="AB3D-9XKF"
            />
            <Text style={styles.hint}>
              Lo encuentras en la tarjeta entregada con tu equipo GPS.
            </Text>
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
                  <Text style={styles.muted}>
                    IMEI {v.device.imei}
                    {v.effective_role !== 'owner' && ` · ${ROLE_LABEL[v.effective_role]}`}
                  </Text>
                </View>
                {v.effective_role === 'owner' && (
                  <Text style={styles.remove} onPress={() => removeVehicle(v.id, v.alias)}>
                    Eliminar
                  </Text>
                )}
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
  hint: { color: colors.textMuted, fontSize: 12 },
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
