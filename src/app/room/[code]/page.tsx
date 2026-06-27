import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import GameClient from './GameClient'

interface RoomPageProps {
  params: Promise<{ code: string }>
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!room) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Check if user is in the room; if not, redirect home
  const { data: roomPlayer } = await supabase
    .from('room_players')
    .select('id')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .single()

  if (!roomPlayer) redirect('/')

  // Load players
  const { data: playerIds } = await supabase
    .from('room_players')
    .select('player_id')
    .eq('room_id', room.id)

  const ids = playerIds?.map(p => p.player_id) ?? []
  const { data: players } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids)

  // Load user's cards
  const { data: cards } = await supabase
    .from('bingo_cards')
    .select('*')
    .eq('room_id', room.id)
    .eq('player_id', user.id)
    .order('card_number')

  // Load drawn numbers
  const { data: drawnNumbers } = await supabase
    .from('drawn_numbers')
    .select('*')
    .eq('room_id', room.id)
    .order('draw_order')

  // Load wins
  const { data: wins } = await supabase
    .from('wins')
    .select('*')
    .eq('room_id', room.id)

  return (
    <GameClient
      room={room}
      currentUser={profile}
      players={players ?? []}
      cards={cards ?? []}
      initialDrawnNumbers={drawnNumbers ?? []}
      initialWins={wins ?? []}
    />
  )
}
