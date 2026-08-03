import type { NextRequest } from 'next/server'
import { AdminProvisionDeviceSchema, formatClaimCode } from '@securitycar/shared'
import { getAuthContext } from '@/lib/api/auth'
import { requireAdmin } from '@/lib/api/admin'
import { fail, handleError, ok } from '@/lib/api/response'
import { generateClaimCode } from '@/lib/devices/claimCode'
import { findDeviceByImei } from '@/lib/flespi/client'
import { SupabaseAdminRepository } from '@/repositories/AdminRepository'

/** Dispositivos de todos los clientes, con búsqueda opcional. Solo staff. */
export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const q = request.nextUrl.searchParams.get('q') ?? undefined
    const repo = new SupabaseAdminRepository(supabase)
    return ok(await repo.listDevices(q))
  } catch (err) {
    return handleError(err)
  }
}

/**
 * Provisiona un equipo GPS y genera su código de activación — equivalente
 * en UI de `scripts/provision-device.mjs`. Si no se pasa `flespi_device_id`,
 * lo resuelve buscando el IMEI en Flespi (igual que el script sin
 * `--flespi-id`). El script CLI sigue siendo válido para altas en campo sin
 * acceso a la app.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase } = await getAuthContext(request)
    await requireAdmin(supabase)
    const body = await request.json().catch(() => null)
    const parsed = AdminProvisionDeviceSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    let flespiDeviceId = parsed.data.flespi_device_id ?? null
    if (!flespiDeviceId) {
      const device = await findDeviceByImei(parsed.data.imei)
      if (!device) {
        return fail(`No hay ningún dispositivo con IMEI ${parsed.data.imei} en Flespi`, 404)
      }
      flespiDeviceId = device.id
    }

    const claimCode = generateClaimCode()
    const repo = new SupabaseAdminRepository(supabase)
    try {
      const created = await repo.provisionDevice({
        imei: parsed.data.imei,
        flespi_device_id: flespiDeviceId,
        sim_iccid: parsed.data.sim_iccid ?? null,
        claim_code: claimCode,
      })
      return ok({ device: created, claim_code: formatClaimCode(claimCode) }, 201)
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as { code?: string }).code === '23505') {
        return fail(`El IMEI ${parsed.data.imei} o el device de Flespi ya está provisionado`, 409)
      }
      throw err
    }
  } catch (err) {
    return handleError(err)
  }
}
