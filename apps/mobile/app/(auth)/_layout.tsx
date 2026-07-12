import { Redirect, Stack } from 'expo-router'
import { View } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/theme/colors'

export default function AuthLayout() {
  const { session, loading } = useAuth()
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />
  if (session) return <Redirect href="/(tabs)" />
  return <Stack screenOptions={{ headerShown: false }} />
}
