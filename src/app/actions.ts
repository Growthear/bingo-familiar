'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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
  count: number
) {
  const cards = generateMultipleCards(count)
  for (let i = 0; i < count; i++) {
    await supabase.from('bingo_cards').insert({
      room_id: roomId,
      player_id: playerId,
      card_number: i + 1,
      numbers: cards[i],
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

  let code = generateCode()
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase.from('rooms').select('code').eq('code', code).single()
    if (!data) break
    code = generateCode()
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({ code, host_id: user.id, interval_seconds: intervalSeconds, cards_per_player: cardsPerPlayer, show_drawn: showDrawn, price_per_card: pricePerCard })
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
    .select('host_id, cards_per_player')
    .eq('id', roomId)
    .single()

  if (!room || room.host_id !== user.id) return { error: 'Solo el host puede reiniciar' }

  const { data: roomPlayers } = await supabase
    .from('room_players')
    .select('player_id')
    .eq('room_id', roomId)

  if (!roomPlayers) return { error: 'Error al obtener jugadores' }

  // Limpiar datos de la partida anterior
  await supabase.from('wins').delete().eq('room_id', roomId)
  await supabase.from('drawn_numbers').delete().eq('room_id', roomId)
  await supabase.from('bingo_cards').delete().eq('room_id', roomId)

  // Generar cartones nuevos para todos los jugadores
  for (const { player_id } of roomPlayers) {
    await insertCards(supabase, roomId, player_id, room.cards_per_player)
  }

  // Volver a waiting — dispara el realtime para todos
  await supabase.from('rooms').update({
    status: 'waiting',
    started_at: null,
    finished_at: null,
    current_prize: null,
  }).eq('id', roomId)

  return {}
}

export async function joinRoom(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const code = (formData.get('code') as string).toUpperCase().trim()

  const { data: room } = await supabase.from('rooms').select('*').eq('code', code).single()

  if (!room) return { error: 'Sala no encontrada. Revisá el código.' }
  if (room.status === 'finished') return { error: 'Esa partida ya terminó.' }
  if (room.status === 'playing') return { error: 'La partida ya empezó. Esperá la próxima.' }

  const { data: existing } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .single()

  if (!existing) {
    await supabase.from('room_players').insert({ room_id: room.id, player_id: user.id })
    await insertCards(supabase, room.id, user.id, room.cards_per_player)
  }

  redirect(`/room/${code}`)
}
