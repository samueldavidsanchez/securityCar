import { Redirect } from 'expo-router'
import { View } from 'react-native'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/theme/colors'

export default function Index() {
  const { session, loading } = useAuth()
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />
  return <Redirect href={session ? '/(tabs)' : '/login'} />
}
