import type { ReactNode } from 'react'

interface Column<T> {
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyLabel?: string
}

/**
 * Tabla mínima para listados admin (vehículos/dispositivos/usuarios). Primera
 * vez que hace falta una tabla real con datos a escala — el resto de la app
 * construye listas ad hoc por pantalla (History, ShareVehicle).
 */
export function Table<T>({ columns, rows, rowKey, emptyLabel = 'Sin resultados' }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-(--color-border) bg-(--color-bg-surface) p-8 text-center text-sm text-(--color-text-muted)">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-(--color-border) bg-(--color-bg-surface)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border)">
            {columns.map(col => (
              <th
                key={col.header}
                className={`px-4 py-3 text-xs font-semibold tracking-wide text-(--color-text-muted) uppercase ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr
              key={rowKey(row)}
              className="border-b border-(--color-border) last:border-0 hover:bg-(--color-bg-elevated)"
            >
              {columns.map(col => (
                <td key={col.header} className={`px-4 py-3 text-(--color-text-primary) ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
