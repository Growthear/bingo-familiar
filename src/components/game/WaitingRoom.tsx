'use client'

import { useState, useTransition } from 'react'
import type { Room, Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface WaitingRoomProps {
  room: Room
  players: Profile[]
  currentUserId: string
}

export default function WaitingRoom({ room, players, currentUserId }: WaitingRoomProps) {
  const isHost = currentUserId === room.host_id
  const [interval, setInterval] = useState(String(room.interval_seconds))
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const handleInterval = (v: string | null) => { if (v) setInterval(v) }

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
    toast.success('¡Código copiado!')
  }

  const startGame = () => {
    startTransition(async () => {
      const { error } = await supabase
        .from('rooms')
        .update({
          status: 'playing',
          interval_seconds: parseInt(interval),
          started_at: new Date().toISOString(),
          current_prize: 'terno',
        })
        .eq('id', room.id)

      if (error) toast.error('No se pudo iniciar la partida')
    })
  }

  return (
    <div className="space-y-4">
      {/* Flag header */}
      <div className="rounded-2xl overflow-hidden shadow-md">
        <div className="h-3 bg-sky-400" />
        <div className="bg-white py-5 flex flex-col items-center gap-1">
          <span className="text-4xl">🇦🇷</span>
          <h1 className="text-xl font-black text-sky-700">Sala de espera</h1>
        </div>
        <div className="h-3 bg-sky-400" />
      </div>

      <Card className="border-sky-200">
        <CardContent className="pt-4 space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Código de sala</p>
            <button
              onClick={copyCode}
              className="text-4xl font-black tracking-widest font-mono text-sky-600 hover:text-sky-800 active:scale-95 transition-all"
            >
              {room.code}
            </button>
            <p className="text-xs text-muted-foreground mt-1">Tocá para copiar y compartilo con tu familia</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-sky-700">Jugadores ({players.length})</p>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 rounded-full px-3 py-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-sky-200 text-sky-700 font-bold">
                      {p.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{p.username}</span>
                  {p.id === room.host_id && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 bg-sky-100 text-sky-700">
                      Host
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isHost && (
        <Card className="border-sky-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-sky-700">Configuración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Velocidad (segundos entre números)</Label>
              <Select value={interval} onValueChange={handleInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10, 15, 20, 30].map(s => (
                    <SelectItem key={s} value={String(s)}>
                      {s} segundos {s === 5 ? '(recomendado)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Cartones por jugador: <strong>{room.cards_per_player}</strong>
            </p>
            <Button
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 text-xl h-auto rounded-xl shadow-lg shadow-sky-200 active:scale-95 transition-all"
              onClick={startGame}
              disabled={isPending || players.length < 1}
            >
              {isPending ? 'Iniciando...' : '¡Iniciar partida! 🎱'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isHost && (
        <div className="text-center py-6">
          <div className="text-3xl mb-2 animate-pulse">⏳</div>
          <p className="text-muted-foreground">Esperando a que el host inicie la partida...</p>
        </div>
      )}
    </div>
  )
}
