import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

// Tipografía oficial del Manual de Marca ("Tipografía" — Poppins).
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-poppins' })

export const metadata: Metadata = {
  title: 'vivancar',
  description: 'Monitoreo y seguridad vehicular en tiempo real',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${poppins.variable} h-full`}>
      <body className="h-full">{children}</body>
    </html>
  )
}
