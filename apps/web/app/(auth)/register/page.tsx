'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    if (!data.session) {
      setNotice('Revisa tu correo para confirmar la cuenta.')
      return
    }
    router.push('/map')
    router.refresh()
  }

  return (
    <Card className="p-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold">Crear cuenta</h1>
        <Input
          id="name"
          label="Nombre"
          placeholder="Tu nombre"
          value={name}
          onChange={e => setName(e.target.value)}
          required
        />
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
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={e => setPassword(e.target.value)}
          minLength={6}
          required
        />
        {error && <p className="text-sm text-[--color-danger]">{error}</p>}
        {notice && <p className="text-sm text-[--color-success]">{notice}</p>}
        <Button type="submit" loading={loading}>
          Registrarme
        </Button>
        <p className="text-center text-sm text-[--color-text-muted]">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[--color-accent] hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </Card>
  )
}
