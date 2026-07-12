import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'
import { colors } from '@/theme/colors'

type Variant = 'primary' | 'secondary' | 'danger' | 'success'

const bg: Record<Variant, string> = {
  primary: colors.accent,
  secondary: colors.bgElevated,
  danger: colors.danger,
  success: colors.success,
}

const fg: Record<Variant, string> = {
  primary: colors.onAccent,
  secondary: colors.textPrimary,
  danger: '#fff',
  success: colors.onAccent,
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg[variant], opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <Text style={[styles.buttonText, { color: fg[variant] }]}>{label}</Text>
      )}
    </Pressable>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput placeholderTextColor={colors.textMuted} style={styles.input} {...props} />
    </View>
  )
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ gap: 3 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  input: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15,
  },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
})
