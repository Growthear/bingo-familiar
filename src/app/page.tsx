import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import HomeClient from './HomeClient'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-1">
            ¡Hola, {profile?.username ?? 'jugador'}! 👋
          </h1>
          <p className="text-muted-foreground">¿Qué querés hacer hoy?</p>
        </div>
        <HomeClient />
      </main>
    </div>
  )
}
