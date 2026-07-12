import type { ApiResponse } from '@securitycar/shared'
import { supabase } from './supabase'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

/**
 * Calls the vivancar Next.js API with the current Supabase access token as a
 * Bearer header. Unwraps the `{ data, error }` envelope and throws on error.
 */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init?.headers,
    },
  })

  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || json.error) {
    throw new Error(json.error ?? 'Error de red')
  }
  return json.data as T
}

/** SWR fetcher — same signature the web app uses. */
export const fetcher = <T>(path: string) => api<T>(path)
