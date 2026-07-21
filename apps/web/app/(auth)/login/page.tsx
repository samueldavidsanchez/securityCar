'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { readNextParam } from '@/lib/next-param'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('Credenciales inválidas')
      return
    }
    router.push(readNextParam())
    router.refresh()
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Iniciar sesión</h1>
        <Input
          id="email"
          type="email"
          label="Correo"
          placeholder="tu@correo.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-[--color-danger]">{error}</p>}
        <Button type="submit" loading={loading}>
          Entrar
        </Button>
        <div className="relative flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[--color-border]" />
          <span className="text-xs text-[--color-text-muted]">o</span>
          <div className="h-px flex-1 bg-[--color-border]" />
        </div>
        <GoogleButton />
        <div className="flex justify-between text-sm text-[--color-text-muted]">
          <Link href="/forgot-password" className="hover:text-[--color-text-secondary]">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/register" className="text-[--color-accent] hover:underline">
            Crear cuenta
          </Link>
        </div>
      </form>
    </Card>
  )
}
