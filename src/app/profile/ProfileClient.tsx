'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import type { Profile, Win } from '@/types/database'
import { PRIZE_LABELS } from '@/lib/bingo/gameLogic'
import { isVibrationEnabled, setVibrationEnabled, vibrate } from '@/lib/vibrate'
import { isSoundEnabled, setSoundEnabled, playSound } from '@/lib/sounds'

interface ProfileClientProps {
  initialProfile: Profile
  initialWins: Win[]
  gamesPlayed: number
}

export default function ProfileClient({ initialProfile, initialWins, gamesPlayed }: ProfileClientProps) {
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState(initialProfile)
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatar_url)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [newUsername, setNewUsername] = useState(initialProfile.username)
  const [savingUsername, startSavingUsername] = useTransition()

  const [mpAlias, setMpAlias] = useState(initialProfile.mp_alias ?? '')
  const [savingAlias, startSavingAlias] = useTransition()

  const [vibrationOn, setVibrationOn] = useState(true)
  const [soundOn, setSoundOn] = useState(true)
  useEffect(() => {
    setVibrationOn(isVibrationEnabled())
    setSoundOn(isSoundEnabled())
  }, [])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, startSavingPassword] = useTransition()

  const bingos = initialWins.filter(w => w.prize_type === 'bingo').length
  const lineas = initialWins.filter(w => w.prize_type === 'linea').length
  const ternos = initialWins.filter(w => w.prize_type === 'terno').length

  // ── Foto de perfil ────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes (JPG, PNG, GIF, WEBP)')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('La imagen debe ser menor a 2MB')
      return
    }

    // Preview inmediato
    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setUploadingPhoto(true)

    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${profile.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error('No se pudo subir la foto')
      setAvatarPreview(null)
      setUploadingPhoto(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithBust = `${publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile.id)

    if (updateError) {
      toast.error('No se pudo guardar la foto en el perfil')
    } else {
      setAvatarUrl(urlWithBust)
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      toast.success('¡Foto de perfil actualizada!')
    }

    setAvatarPreview(null)
    setUploadingPhoto(false)
    // Reset input so se puede volver a subir el mismo archivo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const displayAvatar = avatarPreview ?? avatarUrl

  // ── Cambiar nombre ────────────────────────────────────────────────────────
  const saveUsername = () => {
    const trimmed = newUsername.trim()
    if (trimmed === profile.username) return

    startSavingUsername(async () => {
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

  // ── Alias Mercado Pago ────────────────────────────────────────────────────
  const saveAlias = () => {
    const trimmed = mpAlias.trim()
    if (trimmed === (profile.mp_alias ?? '')) return

    startSavingAlias(async () => {
      if (trimmed.length > 0 && !/^[\w.\-]+$/.test(trimmed)) {
        toast.error('Alias inválido: solo letras, números, puntos, guiones y guiones bajos')
        return
      }
      if (trimmed.length > 22) {
        toast.error('El alias no puede tener más de 22 caracteres')
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ mp_alias: trimmed || null })
        .eq('id', profile.id)

      if (error) {
        toast.error('No se pudo guardar el alias')
      } else {
        setProfile(prev => ({ ...prev, mp_alias: trimmed || null }))
        toast.success('¡Alias guardado!')
      }
    })
  }

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  const savePassword = () => {
    if (newPassword.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    startSavingPassword(async () => {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error('No se pudo cambiar la contraseña')
      } else {
        toast.success('¡Contraseña actualizada!')
        setNewPassword('')
        setConfirmPassword('')
      }
    })
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-10">

      {/* ── Avatar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <div className="relative">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-sky-300 shadow-lg group focus:outline-none focus:ring-4 focus:ring-sky-300"
            aria-label="Cambiar foto de perfil"
          >
            {displayAvatar ? (
              <Image
                src={displayAvatar}
                alt={profile.username}
                fill
                className="object-cover"
                unoptimized={!!avatarPreview}
              />
            ) : (
              <div className="w-full h-full bg-sky-100 flex items-center justify-center">
                <span className="text-3xl font-black text-sky-700">
                  {profile.username.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            {/* Overlay al hacer hover/tap */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xl">📷</span>
              <span className="text-white text-[10px] font-semibold mt-0.5">Cambiar</span>
            </div>
            {/* Loading overlay */}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          {/* Badge de cámara */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto}
            className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-sky-500 border-2 border-white flex items-center justify-center shadow-md hover:bg-sky-600 transition-colors"
            aria-label="Subir foto"
          >
            <span className="text-sm">📷</span>
          </button>
        </div>

        <h1 className="text-xl font-black text-sky-700">{profile.username}</h1>
        <p className="text-xs text-muted-foreground">Tocá la foto para cambiarla</p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Partidas', value: gamesPlayed, color: 'text-foreground', bg: 'bg-sky-50' },
          { label: 'Bingos', value: bingos, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Líneas', value: lineas, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'Ternos', value: ternos, color: 'text-sky-500', bg: 'bg-sky-50' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border border-sky-100 rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Editar nombre ──────────────────────────────────────────────── */}
      <Card className="border-sky-200">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base text-sky-700">✏️ Cambiar nombre</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="username">Nombre de usuario</Label>
            <Input
              id="username"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              maxLength={20}
              className="border-sky-300"
              placeholder="Tu nombre..."
            />
          </div>
          <Button
            onClick={saveUsername}
            disabled={savingUsername || newUsername.trim() === profile.username || newUsername.trim().length < 2}
            className="w-full bg-sky-500 hover:bg-sky-600"
          >
            {savingUsername ? 'Guardando...' : 'Guardar nombre'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Alias Mercado Pago ─────────────────────────────────────────── */}
      <Card className="border-sky-200">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base text-sky-700">💳 Alias Mercado Pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Guardá tu alias para que el host pueda transferirte los premios sin tener que pedírtelo.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="mp-alias">Alias</Label>
            <Input
              id="mp-alias"
              value={mpAlias}
              onChange={e => setMpAlias(e.target.value)}
              maxLength={22}
              className="border-sky-300"
              placeholder="ej: juan.rodriguez.mp"
            />
          </div>
          <Button
            onClick={saveAlias}
            disabled={savingAlias || mpAlias.trim() === (profile.mp_alias ?? '')}
            className="w-full bg-sky-500 hover:bg-sky-600"
          >
            {savingAlias ? 'Guardando...' : 'Guardar alias'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Vibración y sonido ─────────────────────────────────────────── */}
      <Card className="border-sky-200">
        <CardContent className="pt-4 pb-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-black text-sky-700">📳 Vibración</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {vibrationOn ? 'Activada — el celular vibra al jugar' : 'Desactivada'}
              </p>
            </div>
            <button
              onClick={() => {
                const next = !vibrationOn
                setVibrationOn(next)
                setVibrationEnabled(next)
                if (next) vibrate('success')
              }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                vibrationOn ? 'bg-sky-500' : 'bg-gray-200'
              }`}
              aria-label="Toggle vibración"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${vibrationOn ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="h-px bg-sky-50" />

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-black text-sky-700">🔊 Sonidos</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {soundOn ? 'Activados — más diversión al jugar' : 'Desactivados'}
              </p>
            </div>
            <button
              onClick={() => {
                const next = !soundOn
                setSoundOn(next)
                setSoundEnabled(next)
                if (next) playSound('success')
              }}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
                soundOn ? 'bg-sky-500' : 'bg-gray-200'
              }`}
              aria-label="Toggle sonidos"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${soundOn ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ── Cambiar contraseña ─────────────────────────────────────────── */}
      <Card className="border-sky-200">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base text-sky-700">🔐 Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">Nueva contraseña</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="border-sky-300"
              minLength={6}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar contraseña</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repetí la contraseña"
              className={`border-sky-300 ${confirmPassword && confirmPassword !== newPassword ? 'border-red-400' : ''}`}
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
            )}
          </div>
          <Button
            onClick={savePassword}
            disabled={
              savingPassword ||
              newPassword.length < 6 ||
              newPassword !== confirmPassword
            }
            className="w-full bg-sky-500 hover:bg-sky-600"
          >
            {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Últimos premios ────────────────────────────────────────────── */}
      {initialWins.length > 0 && (
        <Card className="border-sky-200">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base text-sky-700">🏆 Últimos premios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {initialWins.slice(-6).reverse().map((w, i, arr) => (
              <div key={w.id}>
                <div className="flex justify-between items-center py-1 text-sm">
                  <span className="text-muted-foreground">
                    {new Date(w.won_at).toLocaleDateString('es-AR', {
                      day: '2-digit', month: 'short', year: '2-digit'
                    })}
                  </span>
                  <Badge className="bg-sky-500 text-white">{PRIZE_LABELS[w.prize_type]}</Badge>
                </div>
                {i < arr.length - 1 && <Separator className="bg-sky-50" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
