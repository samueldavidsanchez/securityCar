import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { api } from './api'

/**
 * Canal de Android para alertas (geocercas). El servidor envía con
 * `channelId: 'alerts'` (apps/web/lib/push/send.ts). En Android 13+ el canal
 * debe existir ANTES de pedir permiso o el diálogo no aparece.
 */
const CHANNEL_ID = 'alerts'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

let registeredToken: string | null = null

/**
 * Pide permiso, obtiene el token de Expo y lo registra en la API para la
 * cuenta actual. Silencioso ante fallos: sin push la app sigue funcionando y
 * se reintenta en el próximo arranque.
 */
export async function registerForPush(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Alertas del vehículo',
        importance: Notifications.AndroidImportance.HIGH,
      })
    }

    let { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status
    }
    if (status !== 'granted') return

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await api('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS === 'ios' ? 'ios' : 'android' }),
    })
    registeredToken = token
  } catch (err) {
    console.warn('[push] no se pudo registrar', err)
  }
}

/**
 * Se llama ANTES de cerrar sesión (después ya no hay Bearer para autorizar el
 * borrado). Sin esto el teléfono seguiría recibiendo alertas de la cuenta.
 */
export async function unregisterPush(): Promise<void> {
  try {
    // Tras reiniciar la app el token en memoria se pierde; se vuelve a pedir
    // (es estable por instalación) solo si hay permiso.
    let token = registeredToken
    if (!token && (await Notifications.getPermissionsAsync()).status === 'granted') {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data
    }
    if (!token) return
    await api('/api/push-tokens', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    })
  } catch (err) {
    console.warn('[push] no se pudo desregistrar', err)
  } finally {
    registeredToken = null
  }
}
