import { Link } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Field } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { colors } from '@/theme/colors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit() {
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email)
    setLoading(false)
    setSent(true)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {sent ? (
          <>
            <Text style={styles.notice}>
              Si el correo existe, recibirás un enlace para restablecer tu contraseña.
            </Text>
            <Link href="/login" style={styles.link}>
              Volver a iniciar sesión
            </Link>
          </>
        ) : (
          <>
            <Text style={styles.title}>Recuperar contraseña</Text>
            <Field
              label="Correo"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tu@correo.com"
            />
            <Button label="Enviar enlace" onPress={onSubmit} loading={loading} />
            <Link href="/login" style={styles.center}>
              Volver
            </Link>
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  inner: { flex: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  notice: { color: colors.success, fontSize: 14, textAlign: 'center' },
  link: { color: colors.accent, textAlign: 'center', fontWeight: '600' },
  center: { textAlign: 'center', color: colors.textMuted },
})
