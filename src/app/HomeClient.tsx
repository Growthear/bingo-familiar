'use client'

import { useActionState, useState } from 'react'
import { createRoom, joinRoom } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function HomeClient() {
  const [createState, createAction, createPending] = useActionState(createRoom, null)
  const [joinState, joinAction, joinPending] = useActionState(joinRoom, null)
  const [intervalSeconds, setIntervalSeconds] = useState('5')
  const [cardsPerPlayer, setCardsPerPlayer] = useState('1')

  const handleInterval = (v: string | null) => { if (v) setIntervalSeconds(v) }
  const handleCards = (v: string | null) => { if (v) setCardsPerPlayer(v) }

  return (
    <Tabs defaultValue="join" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="join">Unirme a sala</TabsTrigger>
        <TabsTrigger value="create">Crear sala</TabsTrigger>
      </TabsList>

      <TabsContent value="join">
        <Card>
          <CardHeader>
            <CardTitle>Unirme a una sala</CardTitle>
            <CardDescription>Pedile el código al organizador</CardDescription>
          </CardHeader>
          <form action={joinAction}>
            <CardContent className="space-y-4">
              {joinState?.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {joinState.error}
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="code">Código de sala</Label>
                <Input
                  id="code"
                  name="code"
                  required
                  placeholder="ej: ABC123"
                  className="text-center text-xl tracking-widest font-mono uppercase"
                  maxLength={6}
                />
              </div>
              <Button className="w-full" type="submit" disabled={joinPending}>
                {joinPending ? 'Entrando...' : 'Entrar a la sala →'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="create">
        <Card>
          <CardHeader>
            <CardTitle>Crear sala</CardTitle>
            <CardDescription>Vos sos el organizador de esta partida</CardDescription>
          </CardHeader>
          <form action={createAction}>
            <CardContent className="space-y-4">
              {createState?.error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  {createState.error}
                </p>
              )}
              <div className="space-y-1.5">
                <Label>Velocidad (segundos entre números)</Label>
                <Select
                  value={intervalSeconds}
                  onValueChange={handleInterval}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10, 15, 20, 30].map(s => (
                      <SelectItem key={s} value={String(s)}>
                        {s} segundos {s === 5 ? '(recomendado)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cartones por jugador</Label>
                <Select
                  value={cardsPerPlayer}
                  onValueChange={handleCards}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={String(n)}>
                        {n} {n === 1 ? 'cartón' : 'cartones'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <input type="hidden" name="interval_seconds" value={intervalSeconds} />
              <input type="hidden" name="cards_per_player" value={cardsPerPlayer} />
              <Button className="w-full bg-violet-600 hover:bg-violet-700" type="submit" disabled={createPending}>
                {createPending ? 'Creando sala...' : 'Crear sala →'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
