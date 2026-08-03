import type { NextRequest } from 'next/server'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseAdminRepository } from '@/repositories/AdminRepository'
import { SupabaseSharingRepository } from '@/repositories/SharingRepository'
import { SupabaseCommandRepository } from '@/repositories/CommandRepository'

/** Detalle de un vehículo de cualquier cliente: metadata, miembros e historial de comandos. */
export async function GET(request: NextRequest, ctx: RouteContext<'/api/admin/vehicles/[id]'>) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params

    const adminRepo = new SupabaseAdminRepository(supabase)
    const vehicle = await adminRepo.getVehicle(id)
    if (!vehicle) return fail('Vehículo no encontrado', 404)

    const sharingRepo = new SupabaseSharingRepository(supabase)
    const commandRepo = new SupabaseCommandRepository(supabase)
    const [members, commands] = await Promise.all([
      sharingRepo.listMembers(id),
      commandRepo.listByVehicle(id),
    ])

    return ok({ vehicle, members, commands })
  } catch (err) {
    return handleError(err)
  }
}

/**
 * Baja de un vehículo de cualquier cliente, p.ej. al dar de baja a su
 * dueño. Soft-delete — command_logs sobrevive como auditoría (migración 0005).
 */
export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/vehicles/[id]'>) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const { id } = await ctx.params
    const repo = new SupabaseAdminRepository(supabase)
    await repo.removeVehicle(id)
    return ok({ removed: true })
  } catch (err) {
    return handleError(err)
  }
}
