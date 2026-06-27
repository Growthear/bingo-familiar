import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import ProfileClient from './ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: wins } = await supabase.from('wins').select('*').eq('player_id', user.id)

  const { data: roomPlayers } = await supabase
    .from('room_players').select('room_id').eq('player_id', user.id)

  let gamesPlayed = 0
  if (roomPlayers && roomPlayers.length > 0) {
    const roomIds = roomPlayers.map(r => r.room_id)
    const { data: rooms } = await supabase
      .from('rooms').select('id').in('id', roomIds).eq('status', 'finished')
    gamesPlayed = rooms?.length ?? 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      <Navbar />
      <ProfileClient
        initialProfile={profile}
        initialWins={wins ?? []}
        gamesPlayed={gamesPlayed}
      />
    </div>
  )
}
