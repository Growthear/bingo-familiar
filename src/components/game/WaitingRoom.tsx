'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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

function formatMoney(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

export default function WaitingRoom({ room, players, currentUserId }: WaitingRoomProps) {
  const router = useRouter()
  const isHost = currentUserId === room.host_id
  const [interval, setInterval] = useState(String(room.interval_seconds))
  const [isPending, startTransition] = useTransition()
  const [isCancelling, startCancelling] = useTransition()
  const [isLeaving, startLeaving] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const supabase = createClient()

  const handleInterval = (v: string | null) => { if (v) setInterval(v) }

  const totalCards = players.length * room.cards_per_player
  const totalPot = totalCards * room.price_per_card
  const ternoPrize = Math.floor(totalPot * 0.10)
  const lineaPrize = Math.floor(totalPot * 0.30)
  const bingoPrize = totalPot - ternoPrize - lineaPrize

  const copyCode = () => {
    navigator.clipboard.writeText(room.code)
    toast.success('¡Código copiado!')
  }

  const cancelRoom = () => {
    startCancelling(async () => {
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'cancelled' })
        .eq('id', room.id)
      if (error) {
        toast.error('No se pudo cancelar la sala')
        setConfirmCancel(false)
      }
      // El realtime actualiza el estado y muestra la pantalla de cancelación para todos
    })
  }

  const leaveRoom = () => {
    startLeaving(async () => {
      await supabase.from('bingo_cards').delete()
        .eq('room_id', room.id).eq('player_id', currentUserId)
      const { error } = await supabase.from('room_players').delete()
        .eq('room_id', room.id).eq('player_id', currentUserId)
      if (error) {
        toast.error('No se pudo abandonar la sala')
        setConfirmLeave(false)
      } else {
        router.push('/')
      }
    })
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

      {/* Alias del host para pagar — solo visible para jugadores, no para el host */}
      {room.price_per_card > 0 && !isHost && (() => {
        const hostProfile = players.find(p => p.id === room.host_id)
        if (!hostProfile?.mp_alias) return null
        const totalToPay = room.price_per_card * room.cards_per_player
        return (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">💳</span>
            <div className="flex-1">
              <p className="text-xs text-green-700 font-semibold">Alias Mercado Pago del host</p>
              <p className="font-black text-green-800 text-base tracking-wide">{hostProfile.mp_alias}</p>
              <div className="flex items-center justify-between mt-0.5">
                <p className="text-[11px] text-green-600">
                  Transferile <strong>{formatMoney(totalToPay)}</strong> a {hostProfile.username}
                </p>
                <p className="text-[11px] text-green-500">{formatMoney(room.price_per_card)}/cartón</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Pozo */}
      {room.price_per_card > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base text-amber-800 flex items-center gap-2">
              💰 Pozo acumulado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="text-center">
              <p className="text-3xl font-black text-amber-700">{formatMoney(totalPot)}</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {players.length} jugador{players.length !== 1 ? 'es' : ''} × {room.cards_per_player} cartón{room.cards_per_player !== 1 ? 'es' : ''} × {formatMoney(room.price_per_card)}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white rounded-xl p-2 border border-amber-200">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Terno</p>
                <p className="text-sm font-black text-amber-800">{formatMoney(ternoPrize)}</p>
                <p className="text-[10px] text-muted-foreground">10%</p>
              </div>
              <div className="bg-white rounded-xl p-2 border border-amber-200">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Línea</p>
                <p className="text-sm font-black text-amber-800">{formatMoney(lineaPrize)}</p>
                <p className="text-[10px] text-muted-foreground">30%</p>
              </div>
              <div className="bg-white rounded-xl p-2 border border-amber-200">
                <p className="text-[10px] font-bold text-amber-600 uppercase">Bingo</p>
                <p className="text-sm font-black text-amber-800">{formatMoney(bingoPrize)}</p>
                <p className="text-[10px] text-muted-foreground">60%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controles del host */}
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
                      {s} segundos
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {interval !== '5' && (
                <p className="text-xs text-muted-foreground">⭐ Recomendamos 5 segundos para una partida fluida</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Cartones por jugador: <strong>{room.cards_per_player}</strong>
            </p>
            <Button
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 text-xl h-auto rounded-xl shadow-lg shadow-sky-200 active:scale-95 transition-all"
              onClick={startGame}
              disabled={isPending || isCancelling || players.length < 1}
            >
              {isPending ? 'Iniciando...' : '¡Iniciar partida! 🎱'}
            </Button>

            {/* Cancelar sala — confirmación inline */}
            {!confirmCancel ? (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
                onClick={() => setConfirmCancel(true)}
                disabled={isPending || isCancelling}
              >
                Cancelar sala
              </Button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-red-700 text-center">¿Cancelar la sala?</p>
                <p className="text-xs text-red-500 text-center">Todos los jugadores serán desconectados.</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setConfirmCancel(false)}
                    disabled={isCancelling}
                  >
                    No, volver
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={cancelRoom}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Jugador esperando — con opción de abandonar */}
      {!isHost && (
        <div className="text-center py-4 space-y-4">
          <div className="text-3xl animate-pulse">⏳</div>
          <p className="text-muted-foreground">Esperando a que el host inicie la partida...</p>

          {!confirmLeave ? (
            <button
              onClick={() => setConfirmLeave(true)}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-red-500 transition-colors"
            >
              Abandonar sala
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2 text-left">
              <p className="text-sm font-semibold text-red-700 text-center">¿Abandonar la sala?</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmLeave(false)}
                  disabled={isLeaving}
                >
                  Quedarme
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={leaveRoom}
                  disabled={isLeaving}
                >
                  {isLeaving ? 'Saliendo...' : 'Sí, salir'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
