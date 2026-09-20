import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { colors } from '@/theme/colors'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // app/index.tsx and (auth)/_layout.tsx already show a bgBase-colored view
  // while useAuth() resolves the persisted session, so handing off from the
  // native splash on first mount (rather than waiting on auth) is seamless.
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bgBase }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgBase },
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
