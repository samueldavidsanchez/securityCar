'use client'

import { use } from 'react'
import Link from 'next/link'
import { ROLE_LABEL } from '@securitycar/shared'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAdminUserAccess } from '@/hooks/useAdmin'

/**
 * Solo lectura: las mutaciones de vehicle_users viven en la página de detalle
 * del vehículo (un solo lugar de escritura para esa tabla).
 */
export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { access, isLoading } = useAdminUserAccess(id)

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/admin/users"
        className="flex w-fit items-center gap-1.5 text-sm text-(--color-text-muted) hover:text-(--color-text-primary)"
      >
        <ArrowLeft size={14} strokeWidth={2} aria-hidden />
        Usuarios
      </Link>

      <h1 className="text-lg font-semibold">Accesos del usuario</h1>

      {isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : access.length === 0 ? (
        <Card>
          <p className="text-sm text-(--color-text-muted)">Este usuario no tiene acceso a ningún vehículo.</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-2">
          {access.map(a => (
            <div key={a.vehicle_id} className="flex items-center justify-between text-sm">
              <Link href={`/admin/vehicles/${a.vehicle_id}`} className="hover:underline">
                {a.alias}
              </Link>
              <span className="text-right text-xs text-(--color-text-muted)">
                {ROLE_LABEL[a.role]}
                <br />
                Desde {new Date(a.granted_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
