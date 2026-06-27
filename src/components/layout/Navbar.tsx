import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="border-b border-sky-200 bg-white/90 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-black text-lg text-sky-700">
          <span>🎱</span>
          <span>Bingo Familiar</span>
        </Link>
        {user && profile ? (
          <div className="flex items-center gap-3">
            <Link href="/ranking" className="text-sm text-muted-foreground hover:text-sky-600 transition-colors">
              🏆 Ranking
            </Link>
            <Link href="/profile">
              <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-sky-200 hover:ring-sky-400 transition-all">
                {profile.avatar_url ? (
                  <span className="relative block w-full h-full overflow-hidden rounded-full">
                    <Image
                      src={profile.avatar_url}
                      alt={profile.username}
                      fill
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <AvatarFallback className="text-xs bg-sky-100 text-sky-700 font-bold">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </Link>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground hover:text-sky-700">
                Salir
              </Button>
            </form>
          </div>
        ) : (
          <Link href="/login">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600">Ingresar</Button>
          </Link>
        )}
      </div>
    </header>
  )
}
