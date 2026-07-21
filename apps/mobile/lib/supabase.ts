import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'
import 'react-native-url-polyfill/auto'

// Persists the session in AsyncStorage. autoRefreshToken keeps the JWT fresh
// so API calls always carry a valid Bearer token.
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)

// `autoRefreshToken` se apoya en un temporizador, y Android/iOS lo congelan
// mientras la app está en segundo plano. Sin esto, al volver tras más de una
// hora el access token está caducado y la primera llamada a la API devuelve
// 401 aunque la sesión siga siendo válida. Hay que parar y rearrancar el
// refresco siguiendo el ciclo de vida de la app.
AppState.addEventListener('change', state => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
