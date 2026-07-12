import type { ApiResponse } from '@securitycar/shared'

/**
 * SWR fetcher that unwraps the `{ data, error }` API envelope and throws on
 * error so SWR surfaces it.
 */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const json = (await res.json()) as ApiResponse<T>
  if (!res.ok || json.error) {
    throw new Error(json.error ?? 'Error de red')
  }
  return json.data as T
}
