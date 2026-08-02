'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <Card className="p-6">
      {sent ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-(--color-success)">
            Si el correo existe, recibirás un enlace para restablecer tu contraseña.
          </p>
          <Link href="/login" className="text-sm text-(--color-accent) hover:underline">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold">Recuperar contraseña</h1>
          <Input
            id="email"
            type="email"
            label="Correo"
            placeholder="tu@correo.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <Button type="submit" loading={loading}>
            Enviar enlace
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-(--color-text-muted) hover:text-(--color-text-secondary)"
          >
            Volver
          </Link>
        </form>
      )}
    </Card>
  )
}
