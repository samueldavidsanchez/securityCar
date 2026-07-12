import { z } from 'zod'
import { getAuthContext } from '@/lib/api/auth'
import { fail, handleError, ok } from '@/lib/api/response'

const UpdateProfileSchema = z.object({
  display_name: z.string().max(80).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

export async function GET(request: Request) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error
    return ok(data)
  } catch (err) {
    return handleError(err)
  }
}

export async function PUT(request: Request) {
  try {
    const { user, supabase } = await getAuthContext(request)
    const body = await request.json().catch(() => null)
    const parsed = UpdateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos', 422)
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('*')
      .single()
    if (error) throw error
    return ok(data)
  } catch (err) {
    return handleError(err)
  }
}
