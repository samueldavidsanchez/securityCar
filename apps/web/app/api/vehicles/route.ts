import { CreateVehicleSchema } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'
import { SupabaseVehicleRepository } from '@/repositories/VehicleRepository'

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const repo = new SupabaseVehicleRepository(supabase)
    const vehicles = await repo.findByOwner(user.id)
    return ok(vehicles)
  } catch (err) {
    return handleError(err)
  }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const body = await request.json().catch(() => null)
    const parsed = CreateVehicleSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const repo = new SupabaseVehicleRepository(supabase)
    const vehicle = await repo.create(user.id, parsed.data)
    return ok(vehicle, 201)
  } catch (err) {
    return handleError(err)
  }
}
