import { NextResponse } from 'next/server'
import type { ApiResponse } from '@securitycar/shared'

export function ok<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null }, { status })
}

export function fail(error: string, status = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ data: null, error }, { status })
}

/**
 * Centralized error handling for route handlers. Converts known error types
 * into structured responses and logs unexpected ones.
 */
export function handleError(err: unknown): NextResponse<ApiResponse<never>> {
  if (err instanceof Error && err.name === 'UnauthorizedError') {
    return fail('No autorizado', 401)
  }
  if (err instanceof Error && err.name === 'VehicleNotFoundError') {
    return fail('Vehículo no encontrado', 404)
  }
  if (err instanceof Error && err.name === 'InsufficientRoleError') {
    return fail(err.message, 403)
  }
  if (err instanceof Error && err.name === 'FlespiError') {
    const status = (err as Error & { status?: number }).status ?? 502
    console.error('[flespi]', err.message)
    return fail('No se pudo comunicar con el dispositivo', status >= 500 ? 502 : status)
  }
  console.error('[api]', err)
  return fail('Error interno del servidor', 500)
}
