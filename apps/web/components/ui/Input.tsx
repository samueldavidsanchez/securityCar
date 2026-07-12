import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...rest }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[--color-text-secondary]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-xl border border-[--color-border] bg-[--color-bg-surface] px-3.5 py-2.5 text-sm text-[--color-text-primary] outline-none transition-colors placeholder:text-[--color-text-muted] focus:border-[--color-accent] ${className}`}
        {...rest}
      />
    </div>
  )
}
