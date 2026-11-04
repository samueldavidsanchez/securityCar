import * as Notifications from 'expo-notifications'
import { Redirect, Tabs, useRouter } from 'expo-router'
import { Gauge, History, MapPin, Settings, ShieldCheck } from 'lucide-react-native'
import { useEffect, useRef } from 'react'
import { View, type ColorValue } from 'react-native'
import { VehicleProvider } from '@/context/VehicleContext'
import { useAuth } from '@/hooks/useAuth'
import { registerForPush } from '@/lib/push'
import { colors } from '@/theme/colors'

export default function TabsLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const userId = session?.user.id
  const lastResponse = Notifications.useLastNotificationResponse()
  const handledRef = useRef<string | null>(null)

  // Un registro por cuenta: si cambia el usuario en el mismo teléfono, el
  // token se reasigna a la nueva cuenta (register_push_token, migración 0009).
  useEffect(() => {
    if (userId) registerForPush()
  }, [userId])

  // Tocar una alerta abre Historial, donde queda el evento. El ref evita
  // re-navegar con la misma respuesta si el layout se vuelve a montar.
  useEffect(() => {
    const id = lastResponse?.notification.request.identifier ?? null
    if (
      lastResponse &&
      id !== handledRef.current &&
      lastResponse.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER &&
      typeof lastResponse.notification.request.content.data?.type === 'string'
    ) {
      handledRef.current = id
      router.push('/history')
    }
  }, [lastResponse, router])

  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bgBase }} />
  if (!session) return <Redirect href="/login" />

  return (
    <VehicleProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.border,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Mapa',
            tabBarIcon: ({ color }: { color: ColorValue }) => <MapPin size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Estado',
            tabBarIcon: ({ color }: { color: ColorValue }) => <Gauge size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="security"
          options={{
            title: 'Seguridad',
            tabBarIcon: ({ color }: { color: ColorValue }) => <ShieldCheck size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Historial',
            tabBarIcon: ({ color }: { color: ColorValue }) => <History size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Ajustes',
            tabBarIcon: ({ color }: { color: ColorValue }) => <Settings size={20} color={color} />,
          }}
        />
        {/* Se abre desde Ajustes; vive dentro de las tabs para heredar VehicleProvider. */}
        <Tabs.Screen name="geofences" options={{ href: null, title: 'Geocercas' }} />
      </Tabs>
    </VehicleProvider>
  )
}
