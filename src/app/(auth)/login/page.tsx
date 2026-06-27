'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { login } from '../actions'
import { resetPassword } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)
  const [resetState, resetAction, resetPending] = useActionState(resetPassword, null)
  const [showReset, setShowReset] = useState(false)

  if (showReset) {
    return (
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="text-5xl mb-2">🔑</div>
          <CardTitle className="text-xl text-sky-700">Recuperar contraseña</CardTitle>
          <CardDescription>Te mandamos un mail para resetearla</CardDescription>
        </CardHeader>
        <form action={resetAction}>
          <CardContent className="space-y-4">
            {resetState?.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {resetState.error}
              </p>
            )}
            {resetState?.success && (
              <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
                {resetState.success}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">Tu email</Label>
              <Input id="reset-email" name="email" type="email" required placeholder="tu@email.com" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button className="w-full bg-sky-500 hover:bg-sky-600" type="submit" disabled={resetPending}>
              {resetPending ? 'Enviando...' : 'Enviar mail de recuperación'}
            </Button>
            <button
              type="button"
              onClick={() => setShowReset(false)}
              className="text-sm text-muted-foreground hover:text-sky-600 underline underline-offset-4"
            >
              Volver al login
            </button>
          </CardFooter>
        </form>
      </Card>
    )
  }

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Contraseña</Label>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-xs text-muted-foreground hover:text-sky-600 underline underline-offset-4"
              >
                ¿Olvidaste la contraseña?
              </button>
            </div>
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
