'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { register } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, null)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🎱</div>
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>Registrate para jugar con tu familia</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input id="username" name="username" required placeholder="ej: Mamá, TíoRoberto..." maxLength={20} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" minLength={6} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            ¿Ya tenés cuenta?{' '}
            <Link href="/login" className="text-primary underline underline-offset-4">
              Iniciá sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
