import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import { ACHIEVEMENTS, CATEGORY_LABELS, CATEGORY_ORDER } from '@/lib/achievements'

export default async function AchievementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_id, earned_at')
    .eq('player_id', user.id)

  const earnedMap = new Map(userAchievements?.map(ua => [ua.achievement_id, ua.earned_at]) ?? [])
  const earned = earnedMap.size
  const total = ACHIEVEMENTS.length
  const pct = total > 0 ? Math.round((earned / total) * 100) : 0

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: ACHIEVEMENTS.filter(a => a.category === cat),
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-yellow-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6 pb-10">

        {/* Header */}
        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="h-3 bg-amber-400" />
          <div className="bg-white py-5 flex flex-col items-center gap-2">
            <span className="text-4xl">🏅</span>
            <h1 className="text-xl font-black text-amber-700">Mis logros</h1>
            <p className="text-sm text-muted-foreground font-medium">
              {earned} / {total} desbloqueados
            </p>
            <div className="w-52 h-2.5 bg-gray-100 rounded-full mt-1">
              <div
                className="h-full bg-amber-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-amber-500 font-bold">{pct}%</p>
          </div>
          <div className="h-3 bg-amber-400" />
        </div>

        {/* Groups */}
        {grouped.map(({ cat, items }) => (
          <div key={cat} className="space-y-2">
            <h2 className="text-sm font-bold text-amber-700 px-1">{CATEGORY_LABELS[cat]}</h2>
            <div className="space-y-2">
              {items.map(a => {
                const earnedAt = earnedMap.get(a.id)
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-4 rounded-2xl p-4 border transition-all ${
                      earnedAt
                        ? 'bg-white border-amber-200 shadow-sm'
                        : 'bg-white/60 border-gray-100 opacity-40 grayscale'
                    }`}
                  >
                    <span className="text-3xl flex-shrink-0 w-10 text-center">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-sm ${earnedAt ? 'text-gray-800' : 'text-gray-400'}`}>
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                        {a.description}
                      </p>
                      {earnedAt && (
                        <p className="text-[10px] text-amber-500 mt-1.5 font-semibold">
                          ✓ {new Date(earnedAt).toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short', year: '2-digit',
                          })}
                        </p>
                      )}
                    </div>
                    {earnedAt && (
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-amber-600 text-sm font-black">✓</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

      </main>
    </div>
  )
}
