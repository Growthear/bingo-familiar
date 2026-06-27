'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="text-5xl mb-2">🇦🇷</div>
        <CardTitle className="text-2xl text-sky-700">Bingo Familiar</CardTitle>
        <CardDescription>Iniciá sesión para jugar</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••" />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="w-full bg-sky-500 hover:bg-sky-600" type="submit" disabled={pending}>
            {pending ? 'Ingresando...' : 'Ingresar'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            ¿No tenés cuenta?{' '}
            <Link href="/register" className="text-primary underline underline-offset-4">
              Registrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
