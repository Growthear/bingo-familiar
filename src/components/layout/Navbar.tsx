import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('username').eq('id', user.id).single()
    profile = data
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span>🎱</span>
          <span>Bingo Familiar</span>
        </Link>
        {user && profile ? (
          <div className="flex items-center gap-3">
            <Link href="/ranking" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Ranking
            </Link>
            <Link href="/profile">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="text-xs bg-violet-100 text-violet-700">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit">Salir</Button>
            </form>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm">Ingresar</Button>
          </Link>
        )}
      </div>
    </header>
  )
}
