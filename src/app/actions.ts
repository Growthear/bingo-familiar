'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { generateBingoCard } from '@/lib/bingo/cardGenerator'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  return Array.from({ length: 6 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('')
}

export async function createRoom(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const intervalSeconds = Math.max(3, Math.min(60, parseInt(formData.get('interval_seconds') as string) || 5))
  const cardsPerPlayer = Math.max(1, Math.min(6, parseInt(formData.get('cards_per_player') as string) || 1))
  const showDrawn = formData.get('show_drawn') === '1'
  const pricePerCard = Math.max(0, parseInt(formData.get('price_per_card') as string) || 0)

  // Find unique code
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

  for (let i = 1; i <= cardsPerPlayer; i++) {
    await supabase.from('bingo_cards').insert({
      room_id: room.id,
      player_id: user.id,
      card_number: i,
      numbers: generateBingoCard(),
    })
  }

  redirect(`/room/${code}`)
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

    for (let i = 1; i <= room.cards_per_player; i++) {
      await supabase.from('bingo_cards').insert({
        room_id: room.id,
        player_id: user.id,
        card_number: i,
        numbers: generateBingoCard(),
      })
    }
  }

  redirect(`/room/${code}`)
}
