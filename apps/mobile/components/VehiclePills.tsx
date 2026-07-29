import { Platform, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { useVehicleContext } from '@/context/VehicleContext'
import { colors } from '@/theme/colors'

/** Horizontal pill selector to switch the active vehicle. */
export function VehiclePills() {
  const { vehicles, selected, selectVehicle } = useVehicleContext()
  if (vehicles.length <= 1) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {vehicles.map(v => {
        const active = v.id === selected?.id
        return (
          <Pressable
            key={v.id}
            onPress={() => selectVehicle(v.id)}
            style={({ pressed }) => [
              styles.pill,
              active && styles.pillActive,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{v.alias}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  pillText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  pillTextActive: { color: colors.onAccent },
})
