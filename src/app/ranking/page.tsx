import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default async function RankingPage() {
  const supabase = await createClient()

  // Get all profiles with their win counts
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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-black mb-6 text-center">🏆 Ranking</h1>

        {stats.length === 0 ? (
          <p className="text-center text-muted-foreground">Todavía no hay partidas jugadas.</p>
        ) : (
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                <span className={`text-2xl font-black w-8 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-muted-foreground'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </span>
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-violet-100 text-violet-700 font-bold">
                    {s.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{s.username}</p>
                  <p className="text-xs text-muted-foreground">{s.gamesPlayed} partidas</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {s.bingos > 0 && <Badge className="bg-yellow-500 text-white text-xs">🎱 {s.bingos}</Badge>}
                  {s.lineas > 0 && <Badge className="bg-violet-500 text-white text-xs">— {s.lineas}</Badge>}
                  {s.ternos > 0 && <Badge className="bg-blue-500 text-white text-xs">3️⃣ {s.ternos}</Badge>}
                  {s.bingos === 0 && s.lineas === 0 && s.ternos === 0 && (
                    <span className="text-xs text-muted-foreground">Sin premios</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-white/60 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground mb-2">Referencias</p>
          <p>🎱 = Bingos · — = Líneas · 3️⃣ = Ternos</p>
        </div>
      </main>
    </div>
  )
}
