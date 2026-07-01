'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { generateMultipleCards } from '@/lib/bingo/cardGenerator'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

async function insertCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  playerId: string,
  count: number,
  gameNumber: number = 1
) {
  const cards = generateMultipleCards(count)
  for (let i = 0; i < count; i++) {
    await supabase.from('bingo_cards').insert({
      room_id: roomId,
      player_id: playerId,
      card_number: i + 1,
      numbers: cards[i],
      game_number: gameNumber,
    })
  }
}

export async function createRoom(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const intervalSeconds = Math.max(3, Math.min(60, parseInt(formData.get('interval_seconds') as string) || 5))
  const cardsPerPlayer = Math.max(1, Math.min(6, parseInt(formData.get('cards_per_player') as string) || 1))
  const showDrawn = formData.get('show_drawn') === '1'
  const pricePerCard = Math.max(0, parseInt(formData.get('price_per_card') as string) || 0)
  const ternoEnabled = formData.get('terno_enabled') !== '0'
  const lineaEnabled = formData.get('linea_enabled') !== '0'
  const sharedPrizes = formData.get('shared_prizes') === '1'

  let code = generateCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.from('rooms').select('code').eq('code', code).single()
    if (!data) break
    code = generateCode()
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ code, host_id: user.id, interval_seconds: intervalSeconds, cards_per_player: cardsPerPlayer, show_drawn: showDrawn, price_per_card: pricePerCard, terno_enabled: ternoEnabled, linea_enabled: lineaEnabled, shared_prizes: sharedPrizes })
    .select()
    .single()

  if (error || !room) return { error: 'No se pudo crear la sala' }

  await supabase.from('room_players').insert({ room_id: room.id, player_id: user.id })
  await insertCards(supabase, room.id, user.id, cardsPerPlayer)

  redirect(`/room/${code}`)
}

export async function restartRoom(roomId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, cards_per_player, game_number')
    .eq('id', roomId)
    .single()

  if (!room || room.host_id !== user.id) return { error: 'Solo el host puede reiniciar' }

  const { data: roomPlayers } = await supabase
    .from('room_players')
    .select('player_id')
    .eq('room_id', roomId)

  if (!roomPlayers) return { error: 'Error al obtener jugadores' }

  const newGameNumber = (room.game_number ?? 1) + 1

  // Solo borrar números sorteados; cartones viejos se preservan (tienen game_number anterior)
  // para no romper el historial de wins que los referencian
  await supabase.from('drawn_numbers').delete().eq('room_id', roomId)

  // Insertar cartones nuevos con el nuevo game_number — cartones viejos quedan en DB sin usarse
  for (const { player_id } of roomPlayers) {
    await insertCards(supabase, roomId, player_id, room.cards_per_player, newGameNumber)
  }

  // Volver a waiting e incrementar game_number — dispara el realtime para todos
  await supabase.from('rooms').update({
    status: 'waiting',
    started_at: null,
    finished_at: null,
    current_prize: null,
    game_number: newGameNumber,
  }).eq('id', roomId)

  return {}
}

export async function resetRanking(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'vidalaugusto47@gmail.com') return { error: 'No autorizado' }
  const { error } = await supabase.rpc('reset_ranking_admin')
  if (error) return { error: error.message }
  revalidatePath('/ranking')
  return {}
}

export async function kickPlayer(roomId: string, playerId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: room } = await supabase
    .from('rooms')
    .select('host_id, status')
    .eq('id', roomId)
    .single()

  if (!room || room.host_id !== user.id) return { error: 'Solo el host puede expulsar jugadores' }
  if (room.status !== 'waiting') return { error: 'Solo se puede expulsar en la sala de espera' }
  if (playerId === user.id) return { error: 'No podés expulsarte a vos mismo' }

  await supabase.from('bingo_cards').delete().eq('room_id', roomId).eq('player_id', playerId)
  await supabase.from('room_players').delete().eq('room_id', roomId).eq('player_id', playerId)

  return {}
}

export async function joinRoom(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = (formData.get('code') as string).toUpperCase().trim()

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()

  if (!room) return { error: 'Sala no encontrada. Revisá el código.' }
  if (room.status === 'cancelled') return { error: 'Esta sala fue cancelada.' }

  // Check if already in the room — allow rejoining regardless of game state
  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .single()

  if (existing) redirect(`/room/${code}`)

  // New player — block if game already started
  if (room.status === 'finished') return { error: 'Esa partida ya terminó.' }
  if (room.status === 'playing' || room.status === 'paused') return { error: 'La partida ya empezó. Esperá la próxima.' }

  await supabase.from('room_players').insert({ room_id: room.id, player_id: user.id })
  await insertCards(supabase, room.id, user.id, room.cards_per_player)

  redirect(`/room/${code}`)
}
