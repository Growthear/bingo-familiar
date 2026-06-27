'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function login(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    if (error.message.includes('Email not confirmed')) {
      return { error: 'Tenés que confirmar tu email antes de ingresar. Revisá tu casilla.' }
    }
    return { error: 'Email o contraseña incorrectos' }
  }

  redirect('/')
}

export async function register(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const username = (formData.get('username') as string).trim()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (username.length < 2 || username.length > 20) {
    return { error: 'El nombre debe tener entre 2 y 20 caracteres' }
  }

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) {
    return { error: 'Ese nombre de usuario ya está en uso' }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Ese email ya está registrado' }
    }
    return { error: 'No se pudo crear la cuenta' }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/update-password`,
  })

  if (error) {
    return { error: 'No se pudo enviar el mail. Verificá el email ingresado.' }
  }

  return { success: '¡Listo! Revisá tu casilla de mail para resetear la contraseña.' }
}
