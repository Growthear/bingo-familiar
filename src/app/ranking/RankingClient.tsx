'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronDownIcon } from 'lucide-react'

interface PlayerStat {
  id: string
  username: string
  bingos: number
  lineas: number
  ternos: number
  gamesPlayed: number
}

export default function RankingClient({ stats }: { stats: PlayerStat[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id)

  if (stats.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">🎱</div>
        <p className="text-muted-foreground">Todavía no hay partidas jugadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
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
                <AvatarFallback className="bg-sky-100 text-sky-700 font-bold text-sm">
                  {s.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
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
