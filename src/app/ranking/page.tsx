import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import RankingClient from './RankingClient'

export default async function RankingPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase.from('profiles').select('id, username')
  const { data: wins } = await supabase.from('wins').select('player_id, prize_type')
  const { data: roomPlayers } = await supabase.from('room_players').select('player_id, room_id')
  const { data: rooms } = await supabase.from('rooms').select('id, status').eq('status', 'finished')

  const finishedRoomIds = new Set((rooms ?? []).map(r => r.id))

  const stats = (profiles ?? []).map(profile => {
    const playerWins = (wins ?? []).filter(w => w.player_id === profile.id)
    const gamesPlayed = new Set(
      (roomPlayers ?? [])
        .filter(rp => rp.player_id === profile.id && finishedRoomIds.has(rp.room_id))
        .map(rp => rp.room_id)
    ).size

    return {
      id: profile.id,
      username: profile.username,
      bingos: playerWins.filter(w => w.prize_type === 'bingo').length,
      lineas: playerWins.filter(w => w.prize_type === 'linea').length,
      ternos: playerWins.filter(w => w.prize_type === 'terno').length,
      gamesPlayed,
    }
  })

  stats.sort((a, b) => b.bingos - a.bingos || b.lineas - a.lineas || b.ternos - a.ternos)

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-black mb-6 text-center text-sky-700">🏆 Ranking</h1>
        <RankingClient stats={stats} />
      </main>
    </div>
  )
}
