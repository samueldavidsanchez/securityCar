import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'

const variants: Record<Variant, string> = {
  primary:
    'bg-(--color-accent) hover:bg-(--color-accent-hover) text-(--color-on-accent) font-semibold hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
  secondary:
    'bg-(--color-bg-elevated) hover:bg-(--color-border) text-(--color-text-primary) hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
  danger:
    'bg-(--color-danger) hover:brightness-110 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
  success:
    'bg-(--color-success) hover:brightness-110 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20',
  ghost: 'bg-transparent hover:bg-(--color-bg-elevated) text-(--color-text-secondary)',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading,
  disabled,
  className = '',
  children,
  ...rest
}: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...rest}
    >
      {loading ? 'Procesando…' : children}
    </button>
  )
}
