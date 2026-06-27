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
  const [showDrawn, setShowDrawn] = useState(false)
  const [pricePerCard, setPricePerCard] = useState('')
  const [ternoEnabled, setTernoEnabled] = useState(true)
  const [lineaEnabled, setLineaEnabled] = useState(true)

  const handleInterval = (v: string | null) => { if (v) setIntervalSeconds(v) }
  const handleCards = (v: string | null) => { if (v) setCardsPerPlayer(v) }

  return (
    <Tabs defaultValue="join" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6 bg-sky-100">
        <TabsTrigger
          value="join"
          className="data-[state=active]:bg-sky-500 data-[state=active]:text-white"
        >
          Unirme a sala
        </TabsTrigger>
        <TabsTrigger
          value="create"
          className="data-[state=active]:bg-sky-500 data-[state=active]:text-white"
        >
          Crear sala
        </TabsTrigger>
      </TabsList>

      <TabsContent value="join">
        <Card className="border-sky-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sky-700">Unirme a una sala</CardTitle>
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
                  className="text-center text-2xl tracking-widest font-mono uppercase h-14 border-sky-300 focus:ring-sky-400"
                  maxLength={6}
                />
              </div>
              <Button
                className="w-full h-12 text-base bg-sky-500 hover:bg-sky-600 font-bold"
                type="submit"
                disabled={joinPending}
              >
                {joinPending ? 'Entrando...' : 'Entrar a la sala →'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </TabsContent>

      <TabsContent value="create">
        <Card className="border-sky-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sky-700">Crear sala</CardTitle>
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
                <Select value={intervalSeconds} onValueChange={handleInterval}>
                  <SelectTrigger className="border-sky-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10, 15, 20, 30].map(s => (
                      <SelectItem key={s} value={String(s)}>
                        {s} segundos
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cartones por jugador</Label>
                <Select value={cardsPerPlayer} onValueChange={handleCards}>
                  <SelectTrigger className="border-sky-300">
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
              <div className="space-y-1.5">
                <Label htmlFor="price_per_card">Precio por cartón (opcional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                  <Input
                    id="price_per_card"
                    name="price_per_card"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={pricePerCard}
                    onChange={e => setPricePerCard(e.target.value)}
                    className="pl-7 border-sky-300"
                  />
                </div>
                {pricePerCard && parseInt(pricePerCard) > 0 && (
                  <p className="text-xs text-sky-600">
                    Pozo estimado con {cardsPerPlayer} cartón/es × {cardsPerPlayer} jugadores...
                    El bingo se lleva 60%, línea 30%, terno 10%
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Premios habilitados</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'terno', label: '🎉 Terno', enabled: ternoEnabled, toggle: () => setTernoEnabled(v => !v), locked: false },
                    { key: 'linea', label: '🎯 Línea', enabled: lineaEnabled, toggle: () => setLineaEnabled(v => !v), locked: false },
                    { key: 'bingo', label: '🎱 Bingo', enabled: true, toggle: () => {}, locked: true },
                  ].map(({ key, label, enabled, toggle, locked }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={toggle}
                      disabled={locked}
                      className={`py-2 px-1 rounded-xl border-2 text-sm font-bold transition-all ${
                        enabled
                          ? 'border-sky-400 bg-sky-50 text-sky-700'
                          : 'border-gray-200 bg-gray-50 text-gray-400 line-through'
                      } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {!ternoEnabled && !lineaEnabled ? 'Bingo: 100% del pozo' :
                   !ternoEnabled ? 'Línea: 20% · Bingo: 80%' :
                   !lineaEnabled ? 'Terno: 20% · Bingo: 80%' :
                   'Terno: 10% · Línea: 30% · Bingo: 60%'}
                </p>
              </div>

              <div className="flex items-center justify-between py-2 border border-sky-100 rounded-xl px-3 bg-sky-50">
                <div>
                  <p className="text-sm font-medium text-sky-800">Mostrar números salidos en cartón</p>
                  <p className="text-xs text-muted-foreground">Los jugadores ven qué números ya salieron aunque no los hayan marcado</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDrawn(v => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${showDrawn ? 'bg-sky-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${showDrawn ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <input type="hidden" name="interval_seconds" value={intervalSeconds} />
              <input type="hidden" name="cards_per_player" value={cardsPerPlayer} />
              <input type="hidden" name="show_drawn" value={showDrawn ? '1' : '0'} />
              <input type="hidden" name="terno_enabled" value={ternoEnabled ? '1' : '0'} />
              <input type="hidden" name="linea_enabled" value={lineaEnabled ? '1' : '0'} />
              <Button
                className="w-full h-12 text-base bg-sky-500 hover:bg-sky-600 font-bold"
                type="submit"
                disabled={createPending}
              >
                {createPending ? 'Creando sala...' : 'Crear sala →'}
              </Button>
            </CardContent>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
