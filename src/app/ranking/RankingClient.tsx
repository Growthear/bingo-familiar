'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resetRanking } from '@/app/actions'
import { toast } from 'sonner'

interface PlayerStat {
  id: string
  username: string
  avatar_url: string | null
  bingos: number
  lineas: number
  ternos: number
  gamesPlayed: number
}

export default function RankingClient({ stats, isAdmin }: { stats: PlayerStat[]; isAdmin: boolean }) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  const handleReset = async () => {
    setResetting(true)
    const result = await resetRanking()
    if (result.error) {
      toast.error(result.error)
      setResetting(false)
    } else {
      toast.success('Ranking reiniciado')
      setConfirming(false)
      setResetting(false)
      router.refresh()
    }
  }

  const adminButton = isAdmin && (
    <div className="mb-6">
      {!confirming ? (
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-500 hover:bg-red-50"
          onClick={() => setConfirming(true)}
        >
          🗑️ Reiniciar ranking
        </Button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
          <p className="text-sm font-semibold text-red-700 text-center">¿Borrar todas las partidas?</p>
          <p className="text-xs text-red-500 text-center">Los perfiles se conservan, solo se borran los resultados.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirming(false)} disabled={resetting}>
              Cancelar
            </Button>
            <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleReset} disabled={resetting}>
              {resetting ? 'Borrando...' : 'Sí, reiniciar'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )

  if (stats.length === 0) {
    return (
      <>
        {adminButton}
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🎱</div>
          <p className="text-muted-foreground">Todavía no hay partidas jugadas.</p>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-2">
      {adminButton}
      {stats.map((s, i) => {
        const isExpanded = expandedId === s.id
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null

        return (
          <div
            key={s.id}
            className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden"
          >
            {/* Fila principal — siempre visible */}
            <button
              onClick={() => toggle(s.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sky-50 active:bg-sky-100 transition-colors"
            >
              {/* Posición */}
              <span className="w-7 text-center flex-shrink-0">
                {medal
                  ? <span className="text-2xl">{medal}</span>
                  : <span className="text-sm font-black text-muted-foreground">{i + 1}</span>
                }
              </span>

              {/* Avatar */}
              <Avatar className="h-9 w-9 flex-shrink-0">
                {s.avatar_url ? (
                  <span className="relative block w-full h-full overflow-hidden rounded-full">
                    <Image src={s.avatar_url} alt={s.username} fill className="object-cover" />
                  </span>
                ) : (
                  <AvatarFallback className="bg-sky-100 text-sky-700 font-bold text-sm">
                    {s.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>

              {/* Nombre completo */}
              <span className="flex-1 font-bold text-sm text-left break-words min-w-0">
                {s.username}
              </span>

              {/* Bingos */}
              {s.bingos > 0 ? (
                <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-black px-2 py-0.5 rounded-full">
                  🎱 {s.bingos}
                </span>
              ) : (
                <span className="flex-shrink-0 text-xs text-muted-foreground">—</span>
              )}

              {/* Chevron */}
              <ChevronDownIcon
                size={16}
                className={`flex-shrink-0 text-sky-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Detalle expandible */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-24' : 'max-h-0'}`}
            >
              <div className="px-4 pb-3 pt-0.5 border-t border-sky-50">
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { label: 'Bingos', value: s.bingos, color: 'text-amber-600' },
                    { label: 'Líneas', value: s.lineas, color: 'text-sky-600' },
                    { label: 'Ternos', value: s.ternos, color: 'text-sky-500' },
                    { label: 'Partidas', value: s.gamesPlayed, color: 'text-gray-600' },
                  ].map(stat => (
                    <div key={stat.label} className="bg-sky-50 rounded-xl py-2">
                      <p className={`text-base font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
