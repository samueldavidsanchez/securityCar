import type { LucideIcon } from 'lucide-react'
import type { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-(--color-border) bg-(--color-bg-surface) p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  icon?: LucideIcon
  accent?: boolean
}

export function Stat({ label, value, icon: Icon, accent }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-(--color-text-muted)">
        {Icon && <Icon size={13} strokeWidth={2} aria-hidden />}
        {label}
      </span>
      <span
        className={`text-lg font-semibold tabular-nums ${accent ? 'text-(--color-accent)' : 'text-(--color-text-primary)'}`}
      >
        {value}
      </span>
    </div>
  )
}
