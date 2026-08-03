'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { Table } from '@/components/ui/Table'
import { useAdminUsers } from '@/hooks/useAdmin'

export default function AdminUsersPage() {
  const [query, setQuery] = useState('')
  const { users, isLoading } = useAdminUsers(query)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-lg font-semibold">Usuarios</h1>
        <div className="w-72">
          <Input
            placeholder="Buscar por email o nombre"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <Table
          rows={users}
          rowKey={u => u.id}
          emptyLabel="No hay usuarios que coincidan con la búsqueda"
          columns={[
            {
              header: 'Usuario',
              render: u => (
                <Link href={`/admin/users/${u.id}`} className="font-medium hover:underline">
                  {u.display_name || u.email}
                </Link>
              ),
            },
            { header: 'Email', render: u => u.email },
            { header: 'Teléfono', render: u => u.phone ?? '—' },
            {
              header: 'ID',
              render: u => (
                <button
                  onClick={() => navigator.clipboard.writeText(u.id)}
                  className="font-mono text-xs text-(--color-text-muted) hover:text-(--color-text-primary)"
                  title="Copiar ID"
                >
                  {u.id.slice(0, 8)}…
                </button>
              ),
            },
            { header: 'Admin', render: u => (u.is_admin ? 'Sí' : '—') },
          ]}
        />
      )}
    </div>
  )
}
