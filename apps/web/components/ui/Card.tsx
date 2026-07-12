import type { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-[--color-border] bg-[--color-bg-surface] p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  icon?: string
  accent?: boolean
}

export function Stat({ label, value, icon, accent }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-[--color-text-muted]">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </span>
      <span
        className={`text-lg font-semibold ${accent ? 'text-[--color-accent]' : 'text-[--color-text-primary]'}`}
      >
        {value}
      </span>
    </div>
  )
}
