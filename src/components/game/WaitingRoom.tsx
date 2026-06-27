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
  const [cards, setCards] = useState(String(room.cards_per_player))
  const handleInterval = (v: string | null) => { if (v) setInterval(v) }
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
    toast.success('Código copiado!')
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-center text-lg">Sala de espera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Código de sala</p>
            <button
              onClick={copyCode}
              className="text-3xl font-black tracking-widest font-mono text-violet-700 hover:text-violet-900 transition-colors"
            >
              {room.code}
            </button>
            <p className="text-xs text-muted-foreground mt-1">Tocá para copiar</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium">Jugadores ({players.length})</p>
            <div className="flex flex-wrap gap-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-1.5 bg-violet-50 rounded-full px-3 py-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-violet-200 text-violet-700">
                      {p.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{p.username}</span>
                  {p.id === room.host_id && <Badge variant="secondary" className="text-[10px] px-1 py-0">Host</Badge>}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isHost && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Velocidad</Label>
              <Select value={interval} onValueChange={handleInterval}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[3, 5, 8, 10, 15, 20, 30].map(s => (
                    <SelectItem key={s} value={String(s)}>{s} segundos</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Cartones por jugador: {room.cards_per_player} (no se puede cambiar una vez que alguien se unió)
            </p>
            <Button
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 text-lg"
              onClick={startGame}
              disabled={isPending || players.length < 1}
            >
              {isPending ? 'Iniciando...' : '¡Iniciar partida!'}
            </Button>
          </CardContent>
        </Card>
      )}

      {!isHost && (
        <p className="text-center text-muted-foreground text-sm">
          Esperando a que el host inicie la partida...
        </p>
      )}
    </div>
  )
}
