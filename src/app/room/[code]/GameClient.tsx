'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, Profile, BingoCard, DrawnNumber, Win, BingoGrid } from '@/types/database'
import { checkPrize, PRIZE_LABELS } from '@/lib/bingo/gameLogic'
import BingoCardComponent from '@/components/bingo/BingoCard'
import NumberDisplay from '@/components/game/NumberDisplay'
import NumberHistoryModal from '@/components/bingo/NumberHistoryModal'
import WaitingRoom from '@/components/game/WaitingRoom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import Link from 'next/link'

interface GameClientProps {
  room: Room
  currentUser: Profile
  players: Profile[]
  cards: BingoCard[]
  initialDrawnNumbers: DrawnNumber[]
  initialWins: Win[]
}

export default function GameClient({
  room: initialRoom,
  currentUser,
  players: initialPlayers,
  cards,
  initialDrawnNumbers,
  initialWins,
}: GameClientProps) {
  const supabase = createClient()

  const [room, setRoom] = useState(initialRoom)
  const [players, setPlayers] = useState(initialPlayers)
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>(
    [...initialDrawnNumbers].sort((a, b) => a.draw_order - b.draw_order).map(d => d.number)
  )
  const [wins, setWins] = useState(initialWins)
  const [markedNumbers, setMarkedNumbers] = useState<Record<string, Set<number>>>({})
  const [historyOpen, setHistoryOpen] = useState(false)
  const [claimingPrize, setClaimingPrize] = useState(false)
  const drawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const isHost = currentUser.id === room.host_id
  const drawnSet = new Set(drawnNumbers)
  const currentNumber = drawnNumbers[drawnNumbers.length - 1] ?? null

  const myWins = wins.filter(w => w.player_id === currentUser.id)
  const wonPrizes = new Set(myWins.map(w => w.prize_type))

  // ── Real-time subscriptions ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'drawn_numbers',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        const n = (payload.new as DrawnNumber).number
        setDrawnNumbers(prev => [...prev, n])
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        setRoom(payload.new as Room)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`,
      }, async () => {
        const { data: playerIds } = await supabase
          .from('room_players').select('player_id').eq('room_id', room.id)
        if (!playerIds) return
        const { data } = await supabase
          .from('profiles').select('*').in('id', playerIds.map(p => p.player_id))
        if (data) setPlayers(data)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'wins',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        const win = payload.new as Win
        setWins(prev => [...prev, win])
        const winner = players.find(p => p.id === win.player_id) ??
          (win.player_id === currentUser.id ? currentUser : null)
        const label = PRIZE_LABELS[win.prize_type] ?? win.prize_type.toUpperCase()
        toast.success(`🎉 ${winner?.username ?? 'Alguien'} cantó ${label}!`, { duration: 5000 })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Host auto-draw ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isHost || room.status !== 'playing') return

    drawIntervalRef.current = setInterval(async () => {
      const { data, error } = await supabase.rpc('draw_next_number', { p_room_id: room.id })
      if (error) { console.error(error); return }
      if (data === null) {
        clearInterval(drawIntervalRef.current!)
        await supabase.from('rooms').update({
          status: 'finished',
          finished_at: new Date().toISOString(),
        }).eq('id', room.id)
      }
    }, room.interval_seconds * 1000)

    return () => { if (drawIntervalRef.current) clearInterval(drawIntervalRef.current) }
  }, [isHost, room.status, room.interval_seconds, room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMark = useCallback((cardId: string, num: number) => {
    setMarkedNumbers(prev => {
      const marks = new Set(prev[cardId] ?? [])
      if (marks.has(num)) marks.delete(num); else marks.add(num)
      return { ...prev, [cardId]: marks }
    })
  }, [])

  const claimPrize = useCallback(async (card: BingoCard, prize: 'terno' | 'linea' | 'bingo') => {
    if (wonPrizes.has(prize)) {
      toast.info(`Ya ganaste el ${prize} en esta partida`)
      return
    }

    const grid = card.numbers as BingoGrid
    if (!checkPrize(grid, drawnSet, prize)) {
      toast.error(`Todavía no tenés ${prize} 😅`)
      return
    }

    setClaimingPrize(true)
    const { data, error } = await supabase.rpc('claim_prize', {
      p_room_id: room.id,
      p_card_id: card.id,
      p_prize_type: prize,
    })
    setClaimingPrize(false)

    if (error) { toast.error('Error al reclamar el premio'); return }

    const result = data as { success: boolean; error?: string }
    if (!result.success) {
      toast.error(result.error ?? 'Premio inválido')
    }
  }, [drawnSet, wonPrizes, room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Waiting state ────────────────────────────────────────────────────────
  if (room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100">
        <div className="max-w-lg mx-auto px-4 py-6">
          <WaitingRoom room={room} players={players} currentUserId={currentUser.id} />
        </div>
      </div>
    )
  }

  // ── Finished state ───────────────────────────────────────────────────────
  if (room.status === 'finished') {
    const sortedWins = [...wins].sort((a, b) => new Date(a.won_at).getTime() - new Date(b.won_at).getTime())
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-6xl">🎊</div>
          <h1 className="text-3xl font-black">¡Partida terminada!</h1>
          <div className="bg-white rounded-2xl p-4 shadow space-y-2">
            {sortedWins.map(w => {
              const winner = players.find(p => p.id === w.player_id)
              return (
                <div key={w.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{winner?.username ?? 'Jugador'}</span>
                  <Badge variant="secondary">{PRIZE_LABELS[w.prize_type]}</Badge>
                </div>
              )
            })}
            {sortedWins.length === 0 && <p className="text-muted-foreground text-sm">Sin premios registrados</p>}
          </div>
          <div className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full">Volver al inicio</Button>
            </Link>
            <Link href="/ranking" className="flex-1">
              <Button className="w-full bg-violet-600 hover:bg-violet-700">Ver ranking</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing state ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-bold text-sm">🎱 Sala {room.code}</span>
          <div className="flex items-center gap-2">
            {(['terno', 'linea', 'bingo'] as const).map(p => (
              <Badge
                key={p}
                variant={wonPrizes.has(p) ? 'default' : 'outline'}
                className={wonPrizes.has(p) ? 'bg-green-500' : ''}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 space-y-4">
        {/* Current number */}
        <NumberDisplay currentNumber={currentNumber} totalDrawn={drawnNumbers.length} />

        {/* History button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setHistoryOpen(true)}
        >
          Ver los {drawnNumbers.length} números salidos
        </Button>

        {/* Cards */}
        {cards.length === 1 ? (
          <div className="space-y-3">
            <BingoCardComponent
              card={cards[0].numbers as BingoGrid}
              drawnNumbers={drawnSet}
              markedNumbers={markedNumbers[cards[0].id] ?? new Set()}
              onToggleMark={(num) => toggleMark(cards[0].id, num)}
            />
            <PrizeButtons card={cards[0]} onClaim={claimPrize} wonPrizes={wonPrizes} disabled={claimingPrize} />
          </div>
        ) : (
          <Tabs defaultValue="0">
            <TabsList className={`grid w-full grid-cols-${Math.min(cards.length, 6)}`}>
              {cards.map((card, i) => (
                <TabsTrigger key={card.id} value={String(i)}>
                  Cartón {i + 1}
                </TabsTrigger>
              ))}
            </TabsList>
            {cards.map((card, i) => (
              <TabsContent key={card.id} value={String(i)} className="space-y-3">
                <BingoCardComponent
                  card={card.numbers as BingoGrid}
                  drawnNumbers={drawnSet}
                  markedNumbers={markedNumbers[card.id] ?? new Set()}
                  onToggleMark={(num) => toggleMark(card.id, num)}
                />
                <PrizeButtons card={card} onClaim={claimPrize} wonPrizes={wonPrizes} disabled={claimingPrize} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Recent wins */}
        {wins.length > 0 && (
          <div className="bg-white/60 rounded-xl p-3 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Premios cantados</p>
            {wins.map(w => {
              const winner = players.find(p => p.id === w.player_id)
              return (
                <div key={w.id} className="flex justify-between items-center text-sm">
                  <span>{winner?.username ?? '?'}</span>
                  <Badge variant="secondary">{PRIZE_LABELS[w.prize_type]}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <NumberHistoryModal
        drawnNumbers={drawnNumbers}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  )
}

function PrizeButtons({
  card,
  onClaim,
  wonPrizes,
  disabled,
}: {
  card: BingoCard
  onClaim: (card: BingoCard, prize: 'terno' | 'linea' | 'bingo') => void
  wonPrizes: Set<string>
  disabled: boolean
}) {
  const prizes: ('terno' | 'linea' | 'bingo')[] = ['terno', 'linea', 'bingo']
  return (
    <div className="grid grid-cols-3 gap-2">
      {prizes.map(prize => (
        <Button
          key={prize}
          onClick={() => onClaim(card, prize)}
          disabled={disabled || wonPrizes.has(prize)}
          variant={wonPrizes.has(prize) ? 'secondary' : 'default'}
          className={
            !wonPrizes.has(prize)
              ? prize === 'bingo'
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white font-black text-base'
                : prize === 'linea'
                ? 'bg-violet-600 hover:bg-violet-700 font-bold'
                : 'bg-blue-500 hover:bg-blue-600 font-bold'
              : ''
          }
        >
          {wonPrizes.has(prize) ? '✓' : PRIZE_LABELS[prize]}
        </Button>
      ))}
    </div>
  )
}
