import Image from 'next/image'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-(--color-bg-base) px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/brand/logo-white.png"
            alt="vivancar"
            width={2085}
            height={364}
            priority
            unoptimized
            className="mb-3 h-8 w-auto"
          />
          <p className="text-sm text-(--color-text-muted)">Monitoreo y seguridad vehicular</p>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-(--color-text-muted)">
          <Link href="/privacy" className="hover:text-(--color-text-secondary)">
            Política de privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}
