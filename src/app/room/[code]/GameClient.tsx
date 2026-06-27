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

  // ── Real-time ────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'drawn_numbers',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        setDrawnNumbers(prev => [...prev, (payload.new as DrawnNumber).number])
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
        toast.success(`🎉 ${winner?.username ?? 'Alguien'} cantó ${PRIZE_LABELS[win.prize_type]}!`, { duration: 5000 })
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
    if (!checkPrize(card.numbers as BingoGrid, drawnSet, prize)) {
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
    if (!result.success) toast.error(result.error ?? 'Premio inválido')
  }, [drawnSet, wonPrizes, room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Waiting ──────────────────────────────────────────────────────────────
  if (room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100">
        <div className="max-w-lg mx-auto px-4 py-6">
          <WaitingRoom room={room} players={players} currentUserId={currentUser.id} />
        </div>
      </div>
    )
  }

  // ── Finished ─────────────────────────────────────────────────────────────
  if (room.status === 'finished') {
    const sortedWins = [...wins].sort((a, b) => new Date(a.won_at).getTime() - new Date(b.won_at).getTime())
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-6xl">🎊</div>
          <h1 className="text-3xl font-black text-sky-700">¡Partida terminada!</h1>
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-200 space-y-2">
            {sortedWins.map(w => {
              const winner = players.find(p => p.id === w.player_id)
              return (
                <div key={w.id} className="flex justify-between items-center text-sm py-1">
                  <span className="font-semibold">{winner?.username ?? 'Jugador'}</span>
                  <Badge className="bg-sky-500 text-white">{PRIZE_LABELS[w.prize_type]}</Badge>
                </div>
              )
            })}
            {sortedWins.length === 0 && (
              <p className="text-muted-foreground text-sm">Sin premios registrados</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full border-sky-300 text-sky-700">Inicio</Button>
            </Link>
            <Link href="/ranking" className="flex-1">
              <Button className="w-full bg-sky-500 hover:bg-sky-600">Ver ranking</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 flex flex-col">

      {/* Sticky header - compact */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-sky-200">
        <div className="max-w-lg mx-auto px-3 h-11 flex items-center justify-between gap-2">
          <span className="font-black text-sky-700 text-sm tracking-wider">🇦🇷 {room.code}</span>
          <div className="flex items-center gap-1.5">
            {(['terno', 'linea', 'bingo'] as const).map(p => (
              <Badge
                key={p}
                variant={wonPrizes.has(p) ? 'default' : 'outline'}
                className={
                  wonPrizes.has(p)
                    ? 'bg-green-500 text-white border-transparent text-[10px] px-1.5 py-0'
                    : 'text-[10px] px-1.5 py-0 border-sky-300 text-sky-600'
                }
              >
                {wonPrizes.has(p) ? '✓ ' : ''}{p}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-3 py-3 flex flex-col gap-3">

        {/* Number ball */}
        <NumberDisplay currentNumber={currentNumber} totalDrawn={drawnNumbers.length} />

        {/* History button */}
        <Button
          variant="outline"
          className="w-full border-sky-300 text-sky-700 hover:bg-sky-50 font-medium"
          onClick={() => setHistoryOpen(true)}
        >
          📋 Ver {drawnNumbers.length} número{drawnNumbers.length !== 1 ? 's' : ''} salidos
        </Button>

        {/* Cards */}
        {cards.length === 1 ? (
          <div className="flex flex-col gap-3">
            <BingoCardComponent
              card={cards[0].numbers as BingoGrid}
              drawnNumbers={drawnSet}
              markedNumbers={markedNumbers[cards[0].id] ?? new Set()}
              onToggleMark={(num) => toggleMark(cards[0].id, num)}
            />
            <PrizeButtons card={cards[0]} onClaim={claimPrize} wonPrizes={wonPrizes} disabled={claimingPrize} />
          </div>
        ) : (
          <Tabs defaultValue="0" className="w-full">
            {/* Scrollable tabs for many cards */}
            <div className="overflow-x-auto pb-1">
              <TabsList className="flex w-max min-w-full gap-1 h-9 bg-sky-100 rounded-lg p-1">
                {cards.map((card, i) => (
                  <TabsTrigger
                    key={card.id}
                    value={String(i)}
                    className="whitespace-nowrap flex-shrink-0 text-xs data-[state=active]:bg-sky-500 data-[state=active]:text-white"
                  >
                    Cartón {i + 1}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {cards.map((card, i) => (
              <TabsContent key={card.id} value={String(i)} className="flex flex-col gap-3 mt-2">
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

        {/* Live wins */}
        {wins.length > 0 && (
          <div className="bg-white/70 border border-sky-100 rounded-xl p-3 space-y-1.5">
            <p className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">Premios cantados</p>
            {wins.map(w => {
              const winner = players.find(p => p.id === w.player_id)
              return (
                <div key={w.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{winner?.username ?? '?'}</span>
                  <Badge className="bg-sky-500 text-white text-xs">{PRIZE_LABELS[w.prize_type]}</Badge>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottom padding for iOS safe area */}
        <div className="h-4" />
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
  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        onClick={() => onClaim(card, 'terno')}
        disabled={disabled || wonPrizes.has('terno')}
        className={`
          h-14 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-60
          ${wonPrizes.has('terno')
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : 'bg-sky-500 text-white shadow-lg shadow-sky-200 hover:bg-sky-600 active:shadow-none'}
        `}
      >
        {wonPrizes.has('terno') ? '✓ Terno' : '¡TERNO!'}
      </button>
      <button
        onClick={() => onClaim(card, 'linea')}
        disabled={disabled || wonPrizes.has('linea')}
        className={`
          h-14 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-60
          ${wonPrizes.has('linea')
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : 'bg-sky-600 text-white shadow-lg shadow-sky-200 hover:bg-sky-700 active:shadow-none'}
        `}
      >
        {wonPrizes.has('linea') ? '✓ Línea' : '¡LÍNEA!'}
      </button>
      <button
        onClick={() => onClaim(card, 'bingo')}
        disabled={disabled || wonPrizes.has('bingo')}
        className={`
          h-14 rounded-xl font-black text-base transition-all active:scale-95 disabled:opacity-60
          ${wonPrizes.has('bingo')
            ? 'bg-green-100 text-green-700 border-2 border-green-300'
            : 'bg-amber-400 text-gray-900 shadow-lg shadow-amber-200 hover:bg-amber-500 active:shadow-none'}
        `}
      >
        {wonPrizes.has('bingo') ? '✓ Bingo' : '¡BINGO! 🎱'}
      </button>
    </div>
  )
}
