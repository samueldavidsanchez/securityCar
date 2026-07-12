import { useRouter } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { Button } from '@/components/ui'
import { colors } from '@/theme/colors'

export function EmptyState() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🚗</Text>
      <Text style={styles.title}>Aún no tienes vehículos</Text>
      <Text style={styles.body}>
        Agrega tu primer vehículo con su ID de dispositivo Flespi para empezar a monitorearlo.
      </Text>
      <Button label="Agregar vehículo" onPress={() => router.push('/settings')} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emoji: { fontSize: 44 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  body: { color: colors.textMuted, textAlign: 'center', marginBottom: 8 },
})
