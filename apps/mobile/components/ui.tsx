import type { LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Platform,
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
  icon: Icon,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  icon?: LucideIcon
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg[variant],
          opacity: disabled || loading ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        !disabled && !loading && styles.buttonElevation,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <>
          {Icon && <Icon size={17} color={fg[variant]} strokeWidth={2.25} />}
          <Text style={[styles.buttonText, { color: fg[variant] }]}>{label}</Text>
        </>
      )}
    </Pressable>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function Field({
  label,
  onFocus,
  onBlur,
  style,
  ...props
}: TextInputProps & { label?: string }) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, focused && styles.inputFocused, style]}
        onFocus={e => {
          setFocused(true)
          onFocus?.(e)
        }}
        onBlur={e => {
          setFocused(false)
          onBlur?.(e)
        }}
        {...props}
      />
    </View>
  )
}

export function Stat({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string
  value: string
  accent?: boolean
  icon?: LucideIcon
}) {
  return (
    <View style={{ gap: 3 }}>
      <View style={styles.statLabelRow}>
        {Icon && <Icon size={13} strokeWidth={2} color={colors.textMuted} />}
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, accent && { color: colors.accent }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonElevation: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),
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
  inputFocused: {
    borderColor: colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statLabel: { color: colors.textMuted, fontSize: 12 },
  statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
})
