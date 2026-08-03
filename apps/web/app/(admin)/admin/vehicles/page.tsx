'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table } from '@/components/ui/Table'
import { useAdminVehicles } from '@/hooks/useAdmin'

export default function AdminVehiclesPage() {
  const [query, setQuery] = useState('')
  const { vehicles, isLoading } = useAdminVehicles(query)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Vehículos</h1>
        <div className="w-72">
          <Input
            placeholder="Buscar por alias, patente, IMEI o email"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <Table
          rows={vehicles}
          rowKey={v => v.id}
          emptyLabel="No hay vehículos que coincidan con la búsqueda"
          columns={[
            {
              header: 'Vehículo',
              render: v => (
                <Link href={`/admin/vehicles/${v.id}`} className="font-medium hover:underline">
                  {v.alias}
                </Link>
              ),
            },
            { header: 'Dueño', render: v => v.owner_email },
            { header: 'Patente', render: v => v.plate ?? '—' },
            { header: 'IMEI', render: v => v.imei ?? '—' },
            { header: 'Alta', render: v => new Date(v.created_at).toLocaleDateString() },
            {
              header: 'Estado',
              render: v =>
                v.deleted_at ? (
                  <span className="text-(--color-danger)">Eliminado</span>
                ) : (
                  (v.device_status ?? '—')
                ),
            },
          ]}
        />
      )}
    </div>
  )
}
