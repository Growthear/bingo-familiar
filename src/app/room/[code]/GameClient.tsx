'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Room, Profile, BingoCard, DrawnNumber, Win, BingoGrid, PrizeType } from '@/types/database'
import { checkPrize, PRIZE_LABELS } from '@/lib/bingo/gameLogic'
import BingoCardComponent from '@/components/bingo/BingoCard'
import NumberDisplay from '@/components/game/NumberDisplay'
import NumberHistoryModal from '@/components/bingo/NumberHistoryModal'
import WaitingRoom from '@/components/game/WaitingRoom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

function formatMoney(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
}

function calcPrizes(pot: number) {
  const terno = Math.floor(pot * 0.10)
  const linea = Math.floor(pot * 0.30)
  const bingo = pot - terno - linea
  return { terno, linea, bingo }
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
  const [celebratingWin, setCelebratingWin] = useState<{ prize: PrizeType; amount: number } | null>(null)
  const drawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Refs to avoid stale closures in realtime handlers
  const playersRef = useRef(players)
  useEffect(() => { playersRef.current = players }, [players])

  const isHost = currentUser.id === room.host_id
  const drawnSet = new Set(drawnNumbers)
  const currentNumber = drawnNumbers[drawnNumbers.length - 1] ?? null

  // Current user's wins
  const myWins = wins.filter(w => w.player_id === currentUser.id)
  const wonPrizes = new Set(myWins.map(w => w.prize_type))
  // All prizes claimed by anyone in the room
  const claimedPrizes = new Set(wins.map(w => w.prize_type))

  const totalPot = room.price_per_card > 0
    ? players.length * room.cards_per_player * room.price_per_card
    : 0
  const prizes = calcPrizes(totalPot)

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

        const winner = playersRef.current.find(p => p.id === win.player_id) ??
          (win.player_id === currentUser.id ? currentUser : null)

        toast.success(`🎉 ${winner?.username ?? 'Alguien'} cantó ${PRIZE_LABELS[win.prize_type]}!`, { duration: 5000 })

        // Show celebration modal for current user
        if (win.player_id === currentUser.id) {
          const pot = playersRef.current.length * initialRoom.cards_per_player * initialRoom.price_per_card
          const p = calcPrizes(pot)
          const amount = p[win.prize_type as PrizeType]
          setCelebratingWin({ prize: win.prize_type as PrizeType, amount })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Host auto-draw (stops when paused or finished) ───────────────────────
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
    if (claimedPrizes.has(prize)) {
      toast.info(`El ${PRIZE_LABELS[prize]} ya fue cantado`)
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
  }, [drawnSet, claimedPrizes, room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const pauseGame = async () => {
    const { error } = await supabase.from('rooms').update({ status: 'paused' }).eq('id', room.id)
    if (error) toast.error('No se pudo pausar')
  }

  const resumeGame = async () => {
    const { error } = await supabase.from('rooms').update({ status: 'playing' }).eq('id', room.id)
    if (error) toast.error('No se pudo reanudar')
  }

  const finishGame = async () => {
    const { error } = await supabase.from('rooms').update({
      status: 'finished',
      finished_at: new Date().toISOString(),
    }).eq('id', room.id)
    if (error) toast.error('No se pudo finalizar')
  }

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
    const bingoWinner = wins.find(w => w.prize_type === 'bingo')
    const bingoWinnerName = bingoWinner ? (players.find(p => p.id === bingoWinner.player_id)?.username ?? 'Alguien') : null

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-6xl">🎊</div>
          <h1 className="text-3xl font-black text-sky-700">¡Partida terminada!</h1>
          {bingoWinnerName && (
            <p className="text-lg font-bold text-amber-700">🎱 ¡{bingoWinnerName} ganó el Bingo!</p>
          )}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-200 space-y-2">
            {sortedWins.map(w => {
              const winner = players.find(p => p.id === w.player_id)
              const prizeAmount = prizes[w.prize_type as PrizeType]
              return (
                <div key={w.id} className="flex justify-between items-center text-sm py-1">
                  <span className="font-semibold">{winner?.username ?? 'Jugador'}</span>
                  <div className="flex items-center gap-2">
                    {totalPot > 0 && (
                      <span className="text-green-700 font-bold text-xs">{formatMoney(prizeAmount)}</span>
                    )}
                    <Badge className="bg-sky-500 text-white">{PRIZE_LABELS[w.prize_type]}</Badge>
                  </div>
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

  // ── Playing / Paused ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-50 flex flex-col">

      {/* Sticky header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-sky-200">
        <div className="max-w-lg mx-auto px-3 h-11 flex items-center justify-between gap-2">
          <span className="font-black text-sky-700 text-sm tracking-wider">🇦🇷 {room.code}</span>
          <div className="flex items-center gap-1.5">
            {room.status === 'paused' && (
              <Badge className="bg-amber-400 text-amber-900 text-[10px] px-1.5 py-0">⏸ PAUSA</Badge>
            )}
            {(['terno', 'linea', 'bingo'] as const).map(p => (
              <Badge
                key={p}
                variant={wonPrizes.has(p) ? 'default' : 'outline'}
                className={
                  wonPrizes.has(p)
                    ? 'bg-green-500 text-white border-transparent text-[10px] px-1.5 py-0'
                    : claimedPrizes.has(p)
                    ? 'text-[10px] px-1.5 py-0 border-gray-300 text-gray-400 line-through'
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

        {/* Paused banner */}
        {room.status === 'paused' && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-center">
            <p className="font-bold text-amber-800">⏸ Partida en pausa</p>
            <p className="text-xs text-amber-600">El host va a reanudar en un momento</p>
          </div>
        )}

        {/* Host controls */}
        {isHost && (
          <div className="flex gap-2">
            {room.status === 'playing' ? (
              <Button
                variant="outline"
                className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={pauseGame}
              >
                ⏸ Pausar
              </Button>
            ) : (
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={resumeGame}
              >
                ▶ Reanudar
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
              onClick={finishGame}
            >
              🏁 Finalizar
            </Button>
          </div>
        )}

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

        {/* Pozo */}
        {totalPot > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-2">
              💰 Pozo — {formatMoney(totalPot)}
            </p>
            <div className="grid grid-cols-3 gap-2 text-center">
              {(['terno', 'linea', 'bingo'] as const).map((prize) => {
                const winner = wins.find(w => w.prize_type === prize)
                const winnerName = winner
                  ? (players.find(p => p.id === winner.player_id)?.username ?? '?')
                  : null
                return (
                  <div
                    key={prize}
                    className={`rounded-lg p-2 border ${winner ? 'bg-green-50 border-green-200' : 'bg-white border-amber-100'}`}
                  >
                    <p className="text-[10px] font-bold text-amber-700 uppercase">
                      {PRIZE_LABELS[prize]}
                    </p>
                    <p className="text-xs font-black text-amber-900">{formatMoney(prizes[prize])}</p>
                    {winnerName
                      ? <p className="text-[9px] text-green-700 font-semibold truncate">✓ {winnerName}</p>
                      : <p className="text-[9px] text-muted-foreground">{prize === 'bingo' ? '60%' : prize === 'linea' ? '30%' : '10%'}</p>
                    }
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Cards stacked vertically */}
        <div className="flex flex-col gap-5">
          {cards.map((card, i) => (
            <div key={card.id} className="flex flex-col gap-2">
              {cards.length > 1 && (
                <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">Cartón {i + 1}</p>
              )}
              <BingoCardComponent
                card={card.numbers as BingoGrid}
                drawnNumbers={drawnSet}
                markedNumbers={markedNumbers[card.id] ?? new Set()}
                onToggleMark={(num) => toggleMark(card.id, num)}
                showDrawn={room.show_drawn}
              />
              <PrizeButtons
                card={card}
                onClaim={claimPrize}
                wonPrizes={wonPrizes}
                claimedPrizes={claimedPrizes}
                disabled={claimingPrize}
              />
            </div>
          ))}
        </div>

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

        <div className="h-4" />
      </main>

      {/* ── History modal ─────────────────────────────────────────────────── */}
      <NumberHistoryModal
        drawnNumbers={drawnNumbers}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      {/* ── Celebration modal ─────────────────────────────────────────────── */}
      <Dialog
        open={celebratingWin !== null}
        onOpenChange={(open) => { if (!open) setCelebratingWin(null) }}
      >
        <DialogContent showCloseButton={false} className="text-center">
          <DialogHeader>
            <div className="text-6xl mb-2">
              {celebratingWin?.prize === 'bingo' ? '🎱' : celebratingWin?.prize === 'linea' ? '🎯' : '🎉'}
            </div>
            <DialogTitle className="text-2xl font-black text-sky-700">
              ¡Cantaste {celebratingWin ? PRIZE_LABELS[celebratingWin.prize] : ''}!
            </DialogTitle>
          </DialogHeader>

          {celebratingWin && (
            <div className="space-y-4 pt-2">
              {celebratingWin.amount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl py-4 px-6">
                  <p className="text-xs text-amber-600 font-medium mb-1">Ganaste</p>
                  <p className="text-3xl font-black text-amber-700">{formatMoney(celebratingWin.amount)}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                {celebratingWin.prize === 'bingo'
                  ? '¡Felicitaciones, ganaste el juego!'
                  : 'Seguí jugando para ganar más premios'}
              </p>
              <Button
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold"
                onClick={() => setCelebratingWin(null)}
              >
                ¡Gracias! 🙌
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PrizeButtons({
  card,
  onClaim,
  wonPrizes,
  claimedPrizes,
  disabled,
}: {
  card: BingoCard
  onClaim: (card: BingoCard, prize: 'terno' | 'linea' | 'bingo') => void
  wonPrizes: Set<string>
  claimedPrizes: Set<string>
  disabled: boolean
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {(['terno', 'linea', 'bingo'] as const).map((prize) => {
        const iWon = wonPrizes.has(prize)
        const someoneWon = claimedPrizes.has(prize) && !iWon
        const isDisabled = disabled || claimedPrizes.has(prize)

        const label = iWon
          ? `✓ ${PRIZE_LABELS[prize]}`
          : someoneWon
          ? 'Ya cantado'
          : `¡${PRIZE_LABELS[prize].toUpperCase()}!${prize === 'bingo' ? ' 🎱' : ''}`

        const style = iWon
          ? 'bg-green-100 text-green-700 border-2 border-green-300'
          : someoneWon
          ? 'bg-gray-100 text-gray-400 border border-gray-200 line-through'
          : prize === 'bingo'
          ? 'bg-amber-400 text-gray-900 shadow-lg shadow-amber-200 hover:bg-amber-500 active:shadow-none'
          : prize === 'linea'
          ? 'bg-sky-600 text-white shadow-lg shadow-sky-200 hover:bg-sky-700 active:shadow-none'
          : 'bg-sky-500 text-white shadow-lg shadow-sky-200 hover:bg-sky-600 active:shadow-none'

        return (
          <button
            key={prize}
            onClick={() => onClaim(card, prize)}
            disabled={isDisabled}
            className={`h-14 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${style}`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
