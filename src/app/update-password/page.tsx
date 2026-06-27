'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error('No se pudo actualizar la contraseña')
    } else {
      toast.success('¡Contraseña actualizada!')
      router.push('/')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-100 via-white to-sky-100">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-5xl mb-2">🔐</div>
          <CardTitle className="text-xl text-sky-700">Nueva contraseña</CardTitle>
          <CardDescription>Elegí una contraseña nueva para tu cuenta</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Nueva contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full bg-sky-500 hover:bg-sky-600" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
