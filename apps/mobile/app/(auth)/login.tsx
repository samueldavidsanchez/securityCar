import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Field } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError('Credenciales inválidas')
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.brand}>
          vivan<Text style={{ color: colors.accent }}>car</Text>
        </Text>
        <Text style={styles.subtitle}>Monitoreo y seguridad vehicular</Text>

        <View style={styles.form}>
          <Text style={styles.title}>Iniciar sesión</Text>
          <Field
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="tu@correo.com"
          />
          <Field
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Entrar" onPress={onSubmit} loading={loading} />
          <View style={styles.links}>
            <Link href="/forgot-password" style={styles.linkMuted}>
              ¿Olvidaste tu contraseña?
            </Link>
            <Link href="/register" style={styles.link}>
              Crear cuenta
            </Link>
          </View>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  inner: { flex: 1, justifyContent: 'center', padding: 24, gap: 8 },
  brand: { fontSize: 34, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  form: { gap: 16 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  error: { color: colors.danger, fontSize: 13 },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { color: colors.accent, fontWeight: '600' },
  linkMuted: { color: colors.textMuted },
})
