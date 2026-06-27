'use client'

import { useEffect, useState, useCallback, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
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
import { restartRoom } from '@/app/actions'
import { vibrate, isVibrationEnabled, setVibrationEnabled } from '@/lib/vibrate'
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/sounds'
import { speakNumber, isVoiceEnabled, setVoiceEnabled, unlockVoice } from '@/lib/voice'

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

function calcPrizes(pot: number, ternoEnabled: boolean, lineaEnabled: boolean) {
  if (!ternoEnabled && !lineaEnabled) return { terno: 0, linea: 0, bingo: pot }
  if (!ternoEnabled) { const l = Math.floor(pot * 0.20); return { terno: 0, linea: l, bingo: pot - l } }
  if (!lineaEnabled) { const t = Math.floor(pot * 0.20); return { terno: t, linea: 0, bingo: pot - t } }
  const terno = Math.floor(pot * 0.10)
  const linea = Math.floor(pot * 0.30)
  return { terno, linea, bingo: pot - terno - linea }
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
  const router = useRouter()

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
  const [pozOpen, setPozOpen] = useState(false)
  const [playersOpen, setPlayersOpen] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [vibrateOn, setVibrateOn] = useState(true)
  const [voiceOn, setVoiceOn] = useState(true)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [isLeaving, startLeaving] = useTransition()
  const [bingoCountdown, setBingoCountdown] = useState<number | null>(null)
  const drawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bingoWonRef = useRef(false)

  useEffect(() => {
    setSoundOn(isSoundEnabled())
    setVibrateOn(isVibrationEnabled())
    setVoiceOn(isVoiceEnabled())
    // iOS necesita un gesto del usuario para desbloquear speechSynthesis
    const handler = () => unlockVoice()
    window.addEventListener('touchstart', handler, { once: true })
    window.addEventListener('click', handler, { once: true })
    return () => {
      window.removeEventListener('touchstart', handler)
      window.removeEventListener('click', handler)
    }
  }, [])

  // Refs to avoid stale closures in realtime handlers
  const playersRef = useRef(players)
  useEffect(() => { playersRef.current = players }, [players])

  const isHost = currentUser.id === room.host_id
  const drawnSet = new Set(drawnNumbers)
  const currentNumber = drawnNumbers[drawnNumbers.length - 1] ?? null

  const myWins = wins.filter(w => w.player_id === currentUser.id)
  const wonPrizes = new Set(myWins.map(w => w.prize_type))

  // In shared mode: prize is locked only if you already won it, OR the window closed (a new number dropped since first claim)
  // In único mode: prize is locked as soon as anyone claims it
  const isPrizeLocked = (prize: PrizeType): boolean => {
    if (wonPrizes.has(prize)) return true
    if (!room.shared_prizes) return wins.some(w => w.prize_type === prize)
    const firstWin = wins.find(w => w.prize_type === prize)
    if (!firstWin) return false
    return drawnNumbers.length > (firstWin.draw_order_at_claim ?? 0)
  }
  const claimedPrizes = new Set((['terno', 'linea', 'bingo'] as PrizeType[]).filter(isPrizeLocked))

  const totalPot = room.price_per_card > 0
    ? players.length * room.cards_per_player * room.price_per_card
    : 0
  const prizes = calcPrizes(totalPot, room.terno_enabled, room.linea_enabled)

  // ── Real-time ────────────────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'drawn_numbers',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        const num = (payload.new as DrawnNumber).number
        setDrawnNumbers(prev => [...prev, num])
        playSound('number')
        speakNumber(num)
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
        event: 'DELETE', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`,
      }, (payload) => {
        const leftId = (payload.old as { player_id: string }).player_id
        setPlayers(prev => prev.filter(p => p.id !== leftId))
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

        if (win.prize_type === 'bingo' && !bingoWonRef.current) {
          bingoWonRef.current = true
          if (drawIntervalRef.current) clearInterval(drawIntervalRef.current)
          setBingoCountdown(5)
        }

        // Show celebration modal for current user
        if (win.player_id === currentUser.id) {
          vibrate('win')
          playSound(win.prize_type === 'bingo' ? 'win' : 'success')
          const pot = playersRef.current.length * initialRoom.cards_per_player * initialRoom.price_per_card
          const p = calcPrizes(pot, initialRoom.terno_enabled, initialRoom.linea_enabled)
          const amount = p[win.prize_type as PrizeType]
          setCelebratingWin({ prize: win.prize_type as PrizeType, amount })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Polling de jugadores en sala de espera (backup del realtime DELETE) ──
  useEffect(() => {
    if (room.status !== 'waiting') return
    const interval = setInterval(async () => {
      const { data: playerIds } = await supabase
        .from('room_players').select('player_id').eq('room_id', room.id)
      if (!playerIds) return
      const { data } = await supabase
        .from('profiles').select('*').in('id', playerIds.map(p => p.player_id))
      if (data) setPlayers(data)
    }, 10000)
    return () => clearInterval(interval)
  }, [room.status, room.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Host auto-draw (stops when paused, finished, or bingo won) ──────────
  useEffect(() => {
    if (!isHost || room.status !== 'playing') return

    drawIntervalRef.current = setInterval(async () => {
      if (bingoWonRef.current) return
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

  // ── Countdown tras bingo ─────────────────────────────────────────────────
  useEffect(() => {
    if (bingoCountdown === null) return
    if (bingoCountdown === 0) {
      if (isHost) finishGame()
      return
    }
    const t = setTimeout(() => setBingoCountdown(n => (n ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [bingoCountdown]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMark = useCallback((cardId: string, num: number) => {
    vibrate('tap')
    playSound('tap')
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
      vibrate('error')
      playSound('error')
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

  const leaveGame = () => {
    startLeaving(async () => {
      await supabase.from('bingo_cards').delete()
        .eq('room_id', room.id).eq('player_id', currentUser.id)
      await supabase.from('room_players').delete()
        .eq('room_id', room.id).eq('player_id', currentUser.id)
      router.push('/')
    })
  }

  // ── Cancelled ────────────────────────────────────────────────────────────
  if (room.status === 'cancelled') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-sm w-full">
          <div className="text-5xl">❌</div>
          <h1 className="text-2xl font-black text-gray-700">Sala cancelada</h1>
          <p className="text-muted-foreground text-sm">El host canceló la sala antes de iniciar la partida.</p>
          <Button className="w-full bg-sky-500 hover:bg-sky-600 mt-2" onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
        </div>
      </div>
    )
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
    const bingoWinners = wins.filter(w => w.prize_type === 'bingo')
    const bingoWinnerNames = bingoWinners.map(w => players.find(p => p.id === w.player_id)?.username ?? 'Alguien')

    const winnersPerPrize = (prize: PrizeType) => wins.filter(w => w.prize_type === prize).length
    const prizePerWinner = (prize: PrizeType) => {
      const count = winnersPerPrize(prize)
      return count > 1 ? Math.floor(prizes[prize] / count) : prizes[prize]
    }

    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm w-full">
          <div className="text-6xl">🎊</div>
          <h1 className="text-3xl font-black text-sky-700">¡Partida terminada!</h1>
          {bingoWinnerNames.length > 0 && (
            <p className="text-lg font-bold text-amber-700">
              🎱 ¡{bingoWinnerNames.join(' y ')} {bingoWinnerNames.length > 1 ? 'ganaron' : 'ganó'} el Bingo!
            </p>
          )}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-sky-200 space-y-2">
            {sortedWins.map(w => {
              const winner = players.find(p => p.id === w.player_id)
              const prize = w.prize_type as PrizeType
              const amount = prizePerWinner(prize)
              const count = winnersPerPrize(prize)
              return (
                <div key={w.id} className="flex justify-between items-start text-sm py-1 gap-2">
                  <div>
                    <p className="font-semibold">{winner?.username ?? 'Jugador'}</p>
                    {isHost && winner?.mp_alias && (
                      <p className="text-[11px] text-muted-foreground">💳 {winner.mp_alias}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {totalPot > 0 && (
                      <div className="text-right">
                        <span className="text-green-700 font-bold text-xs">{formatMoney(amount)}</span>
                        {count > 1 && (
                          <p className="text-[10px] text-muted-foreground">dividido ÷{count}</p>
                        )}
                      </div>
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
          {isHost ? (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full bg-sky-500 hover:bg-sky-600 font-black text-base h-12"
                disabled={restarting}
                onClick={async () => {
                  setRestarting(true)
                  const result = await restartRoom(room.id)
                  if (result.error) {
                    toast.error(result.error)
                    setRestarting(false)
                  }
                  // Si sale bien, el realtime lleva a todos al waiting room
                }}
              >
                {restarting ? 'Preparando...' : '🔄 Jugar de nuevo'}
              </Button>
              <div className="flex gap-2">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full border-sky-300 text-sky-700">Inicio</Button>
                </Link>
                <Link href="/ranking" className="flex-1">
                  <Button variant="outline" className="w-full border-sky-300 text-sky-700">Ranking</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 text-center">
                <p className="text-sm font-medium text-sky-700">⏳ El host puede iniciar otra partida</p>
                <p className="text-xs text-muted-foreground mt-0.5">Si reinicia, volvés a la sala automáticamente</p>
              </div>
              <div className="flex gap-2">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full border-sky-300 text-sky-700">Inicio</Button>
                </Link>
                <Link href="/ranking" className="flex-1">
                  <Button variant="outline" className="w-full border-sky-300 text-sky-700">Ranking</Button>
                </Link>
              </div>
            </div>
          )}
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
          <div className="flex items-center gap-2">
            <span className="font-black text-sky-700 text-sm tracking-wider">🇦🇷 {room.code}</span>
            <button
              onClick={() => setPlayersOpen(true)}
              className="flex items-center gap-1 bg-sky-100 hover:bg-sky-200 active:scale-95 transition-all rounded-lg px-2 py-0.5"
            >
              <span className="text-sm">👥</span>
              <span className="text-[11px] font-bold text-sky-700">{players.length}</span>
            </button>
            {totalPot > 0 && (
              <button
                onClick={() => setPozOpen(true)}
                className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 active:scale-95 transition-all rounded-lg px-2 py-0.5"
              >
                <span className="text-sm">🏆</span>
                <span className="text-[11px] font-bold text-amber-700">{formatMoney(totalPot)}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {room.status === 'paused' && (
              <Badge className="bg-amber-400 text-amber-900 text-[10px] px-1.5 py-0">⏸ PAUSA</Badge>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600"
            >
              ⚙️
            </button>
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

        {/* Bingo countdown banner */}
        {bingoCountdown !== null && bingoCountdown > 0 && (
          <div className="bg-green-50 border-2 border-green-400 rounded-xl px-4 py-3 text-center animate-pulse">
            <p className="font-black text-green-700 text-lg">🎱 ¡Bingo cantado!</p>
            <p className="text-sm text-green-600">
              {room.shared_prizes
                ? `¿También tenés bingo? Tenés ${bingoCountdown}s para reclamar`
                : `La partida termina en ${bingoCountdown}s`}
            </p>
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
              onClick={() => setConfirmFinish(true)}
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
                ternoEnabled={room.terno_enabled}
                lineaEnabled={room.linea_enabled}
                sharedPrizes={room.shared_prizes}
                wins={wins}
                drawnCount={drawnNumbers.length}
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
              const wPrize = w.prize_type as PrizeType
              const wCount = wins.filter(x => x.prize_type === wPrize).length
              const wAmount = wCount > 1 ? Math.floor(prizes[wPrize] / wCount) : prizes[wPrize]
              return (
                <div key={w.id} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{winner?.username ?? '?'}</span>
                  <div className="flex items-center gap-1.5">
                    {totalPot > 0 && (
                      <span className="text-xs font-bold text-amber-700">
                        {formatMoney(wAmount)}{wCount > 1 ? ` ÷${wCount}` : ''}
                      </span>
                    )}
                    <Badge className="bg-sky-500 text-white text-xs">{PRIZE_LABELS[w.prize_type]}</Badge>
                  </div>
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

      {/* ── Modal de jugadores ───────────────────────────────────────────── */}
      <Dialog open={playersOpen} onOpenChange={setPlayersOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-sky-700">
              👥 Jugadores ({players.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 pt-1 max-h-72 overflow-y-auto">
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-sky-50">
                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-sky-700">
                    {p.username.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                  <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{p.username}</p>
                  {isHost && p.mp_alias && (
                    <p className="text-[11px] text-muted-foreground">💳 {p.mp_alias}</p>
                  )}
                </div>
                {p.id === room.host_id && (
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-600 px-2 py-0.5 rounded-full flex-shrink-0">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal del pozo ───────────────────────────────────────────────── */}
      <Dialog open={pozOpen} onOpenChange={setPozOpen}>
        <DialogContent showCloseButton={true}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-amber-700 flex items-center gap-2">
              🏆 Pozo acumulado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <p className="text-3xl font-black text-center text-amber-700">{formatMoney(totalPot)}</p>
            <p className="text-xs text-center text-muted-foreground">
              {players.length} jugador{players.length !== 1 ? 'es' : ''} × {room.cards_per_player} cartón{room.cards_per_player !== 1 ? 'es' : ''} × {formatMoney(room.price_per_card)}
            </p>
            {(() => {
              const noTerno = !room.terno_enabled
              const noLinea = !room.linea_enabled
              const onlyBingo = noTerno && noLinea
              const pcts: Record<PrizeType, string> = {
                terno: noLinea ? '20%' : '10%',
                linea: noTerno ? '20%' : '30%',
                bingo: onlyBingo ? '100%' : (noTerno || noLinea) ? '80%' : '60%',
              }
              const activePrizes = (['terno', 'linea', 'bingo'] as const).filter(p =>
                p === 'bingo' || (p === 'terno' && room.terno_enabled) || (p === 'linea' && room.linea_enabled)
              )
              return (
                <div className={`grid gap-2 text-center ${activePrizes.length === 1 ? 'grid-cols-1' : activePrizes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {activePrizes.map((prize) => {
                    const prizeWins = wins.filter(w => w.prize_type === prize)
                    const winnerNames = prizeWins.map(w => players.find(p => p.id === w.player_id)?.username ?? '?')
                    const perWinner = prizeWins.length > 1 ? Math.floor(prizes[prize] / prizeWins.length) : prizes[prize]
                    return (
                      <div
                        key={prize}
                        className={`rounded-xl p-3 border ${prizeWins.length > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-100'}`}
                      >
                        <p className="text-[11px] font-bold text-amber-700 uppercase mb-1">{PRIZE_LABELS[prize]}</p>
                        <p className="text-sm font-black text-amber-900">{formatMoney(perWinner)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{pcts[prize]}{prizeWins.length > 1 ? ` ÷${prizeWins.length}` : ''}</p>
                        {winnerNames.length > 0 && (
                          <p className="text-[10px] text-green-700 font-bold mt-1">✓ {winnerNames.join(' · ')}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Configuración ────────────────────────────────────────────────── */}
      <Dialog open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); if (!o) setConfirmLeave(false) }}>
        <DialogContent showCloseButton={true} className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-gray-800">⚙️ Configuración</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {[
              { label: '🔊 Sonido', desc: 'Efectos de audio', value: soundOn, toggle: () => { const v = !soundOn; setSoundEnabled(v); setSoundOn(v) } },
              { label: '📳 Vibración', desc: 'Feedback al tocar', value: vibrateOn, toggle: () => { const v = !vibrateOn; setVibrationEnabled(v); setVibrateOn(v) } },
              { label: '🗣️ Voz', desc: 'Canta los números en voz alta', value: voiceOn, toggle: () => { const v = !voiceOn; setVoiceEnabled(v); setVoiceOn(v) } },
            ].map(({ label, desc, value, toggle }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <button
                  type="button"
                  onClick={toggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${value ? 'bg-sky-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            ))}

            {!isHost && (
              <div className="pt-1">
                {!confirmLeave ? (
                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="w-full text-sm text-red-500 font-medium py-2 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    🚪 Abandonar partida
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                    <p className="text-sm font-semibold text-red-700 text-center">¿Abandonar la partida?</p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmLeave(false)} disabled={isLeaving}>
                        Quedarme
                      </Button>
                      <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={leaveGame} disabled={isLeaving}>
                        {isLeaving ? 'Saliendo...' : 'Sí, salir'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar finalizar ───────────────────────────────────────────── */}
      <Dialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <DialogContent showCloseButton={false} className="text-center max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-gray-800">¿Finalizar la partida?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">La partida se cerrará para todos los jugadores.</p>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmFinish(false)}>
              Cancelar
            </Button>
            <Button
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={() => { setConfirmFinish(false); finishGame() }}
            >
              Sí, finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
  ternoEnabled,
  lineaEnabled,
  sharedPrizes,
  wins,
  drawnCount,
}: {
  card: BingoCard
  onClaim: (card: BingoCard, prize: 'terno' | 'linea' | 'bingo') => void
  wonPrizes: Set<string>
  claimedPrizes: Set<string>
  disabled: boolean
  ternoEnabled: boolean
  lineaEnabled: boolean
  sharedPrizes: boolean
  wins: import('@/types/database').Win[]
  drawnCount: number
}) {
  const activePrizes = (['terno', 'linea', 'bingo'] as const).filter(p =>
    p === 'bingo' || (p === 'terno' && ternoEnabled) || (p === 'linea' && lineaEnabled)
  )
  return (
    <div className={`grid gap-2 ${activePrizes.length === 1 ? 'grid-cols-1' : activePrizes.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {activePrizes.map((prize) => {
        const iWon = wonPrizes.has(prize)
        const firstWin = wins.find(w => w.prize_type === prize)
        const windowOpen = sharedPrizes && firstWin && drawnCount === (firstWin.draw_order_at_claim ?? 0)
        const someoneWon = claimedPrizes.has(prize) && !iWon && !windowOpen
        const isDisabled = disabled || (iWon ? true : someoneWon)

        const label = iWon
          ? `✓ ${PRIZE_LABELS[prize]}`
          : windowOpen
          ? `¡También! 🤝`
          : someoneWon
          ? 'Ya cantado'
          : `¡${PRIZE_LABELS[prize].toUpperCase()}!${prize === 'bingo' ? ' 🎱' : ''}`

        const style = iWon
          ? 'bg-green-100 text-green-700 border-2 border-green-300'
          : windowOpen
          ? 'bg-purple-500 text-white shadow-lg shadow-purple-200 hover:bg-purple-600 active:shadow-none animate-pulse'
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
