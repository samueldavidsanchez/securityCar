import type { LucideIcon } from 'lucide-react-native'
import { StyleSheet, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { colors } from '@/theme/colors'

const THUMB_SIZE = 46
const TRACK_PADDING = 4
const THRESHOLD = 0.78

interface Props {
  label: string
  icon: LucideIcon
  variant: 'danger' | 'success'
  loading: boolean
  onConfirm: () => void
}

/**
 * Control deslizante para confirmar una acción física irreversible (bloquear
 * el motor, p. ej.) sin un paso extra de modal — el propio gesto es la
 * confirmación. Espejo del componente web equivalente, aquí con
 * react-native-gesture-handler + Reanimated para que el arrastre corra en el
 * hilo nativo (ambos ya eran dependencias del proyecto).
 */
export function SlideToConfirm({ label, icon: Icon, variant, loading, onConfirm }: Props) {
  const color = variant === 'danger' ? colors.danger : colors.success
  const translateX = useSharedValue(0)
  const trackWidth = useSharedValue(0)

  const gesture = Gesture.Pan()
    .enabled(!loading)
    .onUpdate(e => {
      const maxDrag = Math.max(trackWidth.value - THUMB_SIZE - TRACK_PADDING * 2, 0)
      translateX.value = Math.min(Math.max(e.translationX, 0), maxDrag)
    })
    .onEnd(() => {
      const maxDrag = trackWidth.value - THUMB_SIZE - TRACK_PADDING * 2
      if (maxDrag > 0 && translateX.value >= maxDrag * THRESHOLD) {
        runOnJS(onConfirm)()
      } else {
        translateX.value = withSpring(0, { damping: 18 })
      }
    })

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))
  const fillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + TRACK_PADDING,
  }))

  return (
    <View
      style={[styles.track, loading && styles.trackLoading]}
      onLayout={e => {
        trackWidth.value = e.nativeEvent.layout.width
      }}
    >
      <Animated.View style={[styles.fill, fillStyle, { backgroundColor: color + '2E' }]} />
      <Text style={styles.label} pointerEvents="none">
        {loading ? 'Enviando…' : `Desliza para ${label.toLowerCase()}`}
      </Text>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.thumb, thumbStyle, { backgroundColor: color }]}>
          <Icon size={18} strokeWidth={2} color="#fff" />
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  trackLoading: { opacity: 0.7 },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  label: { textAlign: 'center', fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  thumb: {
    position: 'absolute',
    left: TRACK_PADDING,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
