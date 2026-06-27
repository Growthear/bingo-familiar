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
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Argentine flag accent */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🇦🇷</div>
          <h1 className="text-3xl font-black text-sky-700 mb-1">
            ¡Hola, {profile?.username ?? 'jugador'}!
          </h1>
          <p className="text-muted-foreground">¿Jugamos al bingo hoy?</p>
        </div>
        <HomeClient />
      </main>
    </div>
  )
}
