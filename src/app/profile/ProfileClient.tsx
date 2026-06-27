'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Profile, Win } from '@/types/database'
import { PRIZE_LABELS } from '@/lib/bingo/gameLogic'

interface ProfileClientProps {
  initialProfile: Profile
  initialWins: Win[]
  gamesPlayed: number
}

export default function ProfileClient({ initialProfile, initialWins, gamesPlayed }: ProfileClientProps) {
  const supabase = createClient()
  const [profile, setProfile] = useState(initialProfile)
  const [newUsername, setNewUsername] = useState(initialProfile.username)
  const [isPending, startTransition] = useTransition()

  const bingos = initialWins.filter(w => w.prize_type === 'bingo').length
  const lineas = initialWins.filter(w => w.prize_type === 'linea').length
  const ternos = initialWins.filter(w => w.prize_type === 'terno').length

  const updateUsername = () => {
    const trimmed = newUsername.trim()
    if (trimmed === profile.username) return

    startTransition(async () => {
      if (trimmed.length < 2 || trimmed.length > 20) {
        toast.error('El nombre debe tener entre 2 y 20 caracteres')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({ username: trimmed })
        .eq('id', profile.id)

      if (error) {
        toast.error(error.message.includes('unique') ? 'Ese nombre ya está en uso' : 'No se pudo actualizar')
      } else {
        setProfile(prev => ({ ...prev, username: trimmed }))
        toast.success('¡Nombre actualizado!')
      }
    })
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-4">
      <div className="text-center">
        <Avatar className="h-20 w-20 mx-auto mb-3">
          <AvatarFallback className="text-3xl bg-violet-200 text-violet-700 font-bold">
            {profile.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-black">{profile.username}</h1>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Partidas', value: gamesPlayed, color: 'text-foreground' },
          { label: 'Bingos', value: bingos, color: 'text-yellow-600' },
          { label: 'Líneas', value: lineas, color: 'text-violet-600' },
          { label: 'Ternos', value: ternos, color: 'text-blue-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {initialWins.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Últimos premios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {initialWins.slice(-5).reverse().map(w => (
              <div key={w.id} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  {new Date(w.won_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                </span>
                <Badge variant="secondary">{PRIZE_LABELS[w.prize_type]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cambiar nombre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              maxLength={20}
            />
          </div>
          <Button
            onClick={updateUsername}
            disabled={isPending || newUsername.trim() === profile.username}
            className="w-full"
          >
            {isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
