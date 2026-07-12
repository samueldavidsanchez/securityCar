import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Field } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

export default function Register() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit() {
    setError(null)
    setNotice(null)
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })
    setLoading(false)
    if (error) return setError(error.message)
    if (!data.session) return setNotice('Revisa tu correo para confirmar la cuenta.')
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.title}>Crear cuenta</Text>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Tu nombre" />
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
          placeholder="Mínimo 6 caracteres"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {notice && <Text style={styles.notice}>{notice}</Text>}
        <Button label="Registrarme" onPress={onSubmit} loading={loading} />
        <Link href="/login" style={styles.center}>
          ¿Ya tienes cuenta? <Text style={{ color: colors.accent }}>Inicia sesión</Text>
        </Link>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  inner: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  error: { color: colors.danger, fontSize: 13 },
  notice: { color: colors.success, fontSize: 13 },
  center: { textAlign: 'center', color: colors.textMuted },
})
