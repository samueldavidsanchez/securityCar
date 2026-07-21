import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'
import { GoogleAuthError, isGoogleAuthConfigured, signInWithGoogle } from '@/lib/google-auth'
import { colors } from '@/theme/colors'

/**
 * No se renderiza si faltan los client IDs de Google, para no ofrecer un botón
 * que siempre falla en builds donde aún no se ha configurado el proveedor.
 */
export function GoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isGoogleAuthConfigured) return null

  async function onPress() {
    setError(null)
    setLoading(true)
    try {
      const signedIn = await signInWithGoogle()
      if (signedIn) onSuccess()
    } catch (e) {
      setError(e instanceof GoogleAuthError ? e.message : 'No se pudo iniciar sesión con Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.button,
          { opacity: loading ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.textPrimary} />
        ) : (
          <Text style={styles.label}>Continuar con Google</Text>
        )}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  error: { color: colors.danger, fontSize: 13 },
})
