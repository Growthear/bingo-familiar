import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/Navbar'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

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

        {stats.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎱</div>
            <p className="text-muted-foreground">Todavía no hay partidas jugadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.map((s, i) => (
              <div key={s.id} className="bg-white rounded-2xl p-4 shadow-sm border border-sky-100 flex items-center gap-3">
                <span className="text-2xl w-8 text-center">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                    <span className="text-base font-black text-muted-foreground">{i + 1}</span>
                  )}
                </span>
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarFallback className="bg-sky-100 text-sky-700 font-bold text-sm">
                    {s.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{s.username}</p>
                  <p className="text-xs text-muted-foreground">{s.gamesPlayed} partidas</p>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end flex-shrink-0">
                  {s.bingos > 0 && (
                    <Badge className="bg-amber-400 text-gray-900 text-xs font-bold">🎱 {s.bingos}</Badge>
                  )}
                  {s.lineas > 0 && (
                    <Badge className="bg-sky-500 text-white text-xs">— {s.lineas}</Badge>
                  )}
                  {s.ternos > 0 && (
                    <Badge className="bg-sky-300 text-sky-900 text-xs">3 {s.ternos}</Badge>
                  )}
                  {s.bingos === 0 && s.lineas === 0 && s.ternos === 0 && (
                    <span className="text-xs text-muted-foreground">Sin premios</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-white/70 border border-sky-100 rounded-xl p-4 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground mb-2">Referencias</p>
          <p>🎱 = Bingos · — = Líneas · 3 = Ternos</p>
        </div>
      </main>
    </div>
  )
}
