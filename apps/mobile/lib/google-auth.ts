import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { supabase } from './supabase'

/**
 * Login con Google nativo.
 *
 * A diferencia de la web, aquí NO se usa `signInWithOAuth`: el SDK nativo de
 * Google devuelve un `id_token` que se canjea con Supabase mediante
 * `signInWithIdToken`. No hay navegador, ni redirect URI, ni deep link, que es
 * donde se concentran los fallos del flujo OAuth en móvil.
 *
 * Requiere un development build — este módulo nativo no existe en Expo Go.
 */

// El *web* client ID, no el de Android. Es el error de configuración más común:
// con el de Android, Google devuelve DEVELOPER_ERROR. Android se identifica por
// el SHA-1 del keystore registrado en Google Console, no por un id en el código.
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

/** Permite ocultar el botón si el proyecto aún no tiene los client IDs. */
export const isGoogleAuthConfigured = Boolean(webClientId)

if (webClientId) {
  GoogleSignin.configure({
    webClientId,
    ...(iosClientId ? { iosClientId } : {}),
    scopes: ['profile', 'email'],
  })
}

export class GoogleAuthError extends Error {}

/**
 * Devuelve `false` si el usuario canceló (no es un error que deba mostrarse),
 * `true` si la sesión de Supabase quedó establecida.
 */
export async function signInWithGoogle(): Promise<boolean> {
  if (!webClientId) {
    throw new GoogleAuthError('Google Sign-In no está configurado en esta app.')
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()

    if (!isSuccessResponse(response)) return false // cancelado por el usuario

    const idToken = response.data.idToken
    if (!idToken) {
      throw new GoogleAuthError('Google no devolvió un token de identidad.')
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    })
    if (error) throw new GoogleAuthError(error.message)

    return true
  } catch (err) {
    if (err instanceof GoogleAuthError) throw err

    if (isErrorWithCode(err)) {
      switch (err.code) {
        case statusCodes.SIGN_IN_CANCELLED:
          return false
        case statusCodes.IN_PROGRESS:
          return false
        case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
          throw new GoogleAuthError('Google Play Services no está disponible en este dispositivo.')
        default:
          // DEVELOPER_ERROR cae aquí: casi siempre es que el SHA-1 del build no
          // coincide con el registrado en Google Console, o que se configuró el
          // client ID de Android en vez del web.
          throw new GoogleAuthError(`No se pudo iniciar sesión con Google (${err.code}).`)
      }
    }
    throw new GoogleAuthError('No se pudo iniciar sesión con Google.')
  }
}

/** Cierra la sesión de Google además de la de Supabase. */
export async function signOutGoogle(): Promise<void> {
  if (!webClientId) return
  try {
    await GoogleSignin.signOut()
  } catch {
    // Si no había sesión de Google, no es un fallo relevante.
  }
}
