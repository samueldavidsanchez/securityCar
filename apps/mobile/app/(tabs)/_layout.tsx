import { Redirect, Tabs } from 'expo-router'
import { Gauge, History, MapPin, Settings, ShieldCheck } from 'lucide-react-native'
import { View, type ColorValue } from 'react-native'
import { VehicleProvider } from '@/context/VehicleContext'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/theme/colors'

export default function TabsLayout() {
  const { session, loading } = useAuth()
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
      </Tabs>
    </VehicleProvider>
  )
}
