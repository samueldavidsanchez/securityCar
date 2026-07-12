import { Redirect, Tabs } from 'expo-router'
import { Text, View, type ColorValue } from 'react-native'
import { VehicleProvider } from '@/context/VehicleContext'
import { useAuth } from '@/hooks/useAuth'
import { colors } from '@/theme/colors'

function TabIcon({ icon, color }: { icon: string; color: ColorValue }) {
  return <Text style={{ fontSize: 20, color }}>{icon}</Text>
}

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
          options={{ title: 'Mapa', tabBarIcon: ({ color }) => <TabIcon icon="🗺️" color={color} /> }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{ title: 'Estado', tabBarIcon: ({ color }) => <TabIcon icon="📊" color={color} /> }}
        />
        <Tabs.Screen
          name="security"
          options={{ title: 'Seguridad', tabBarIcon: ({ color }) => <TabIcon icon="🔒" color={color} /> }}
        />
        <Tabs.Screen
          name="history"
          options={{ title: 'Historial', tabBarIcon: ({ color }) => <TabIcon icon="📍" color={color} /> }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <TabIcon icon="⚙️" color={color} /> }}
        />
      </Tabs>
    </VehicleProvider>
  )
}
