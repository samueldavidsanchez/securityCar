import Image from 'next/image'

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
      </div>
    </div>
  )
}
