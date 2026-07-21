import { z } from 'zod'

/**
 * Crear invitación. El rol por defecto es 'viewer': conceder 'driver' (que
 * permite enviar comandos, incluido el bloqueo de motor) tiene que ser una
 * decisión explícita del propietario.
 *
 * `email` es opcional y meramente informativo — sirve para que el dueño
 * recuerde a quién invitó. No se valida al aceptar: quien tenga el enlace
 * entra.
 */
export const CreateInvitationSchema = z.object({
  email: z.email().max(255).nullable().optional(),
  role: z.enum(['driver', 'viewer']).default('viewer'),
})

export const UpdateMemberRoleSchema = z.object({
  role: z.enum(['driver', 'viewer']),
})

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>
export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>
