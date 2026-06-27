'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { MenuIcon, XIcon } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavbarClientProps {
  profile: { username: string; avatar_url: string | null } | null
}

// Actualizá estas URLs con tus redes sociales reales
const INSTAGRAM_URL = 'https://instagram.com/bingofamiliar'
const FACEBOOK_URL = 'https://facebook.com/bingofamiliar'
const WHATSAPP_URL = 'https://wa.me/5491100000000'

export default function NavbarClient({ profile }: NavbarClientProps) {
  const [open, setOpen] = useState(false)

  const avatarContent = profile?.avatar_url ? (
    <span className="relative block w-full h-full overflow-hidden rounded-full">
      <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" />
    </span>
  ) : (
    <AvatarFallback className="text-xs bg-sky-100 text-sky-700 font-bold">
      {profile?.username.slice(0, 2).toUpperCase()}
    </AvatarFallback>
  )

  return (
    <>
      {/* ── Desktop ─────────────────────────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-3">
        {profile ? (
          <>
            <Link href="/ranking" className="text-sm text-muted-foreground hover:text-sky-600 transition-colors">
              🏆 Ranking
            </Link>
            <Link href="/profile">
              <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-sky-200 hover:ring-sky-400 transition-all">
                {avatarContent}
              </Avatar>
            </Link>
            <form action={logout}>
              <Button variant="ghost" size="sm" type="submit" className="text-muted-foreground hover:text-sky-700">
                Salir
              </Button>
            </form>
          </>
        ) : (
          <Link href="/login">
            <Button size="sm" className="bg-sky-500 hover:bg-sky-600">Ingresar</Button>
          </Link>
        )}
      </div>

      {/* ── Mobile hamburger button ──────────────────────────────────────── */}
      <button
        className="sm:hidden p-2 -mr-1 text-sky-700 rounded-lg hover:bg-sky-50 active:bg-sky-100"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <MenuIcon size={22} />
      </button>

      {/* ── Mobile drawer — portaled to body to evitar stacking context ─── */}
      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-[200]"
            onClick={() => setOpen(false)}
          />

          {/* Slide panel desde la derecha */}
          <div className="fixed top-0 right-0 h-full w-72 max-w-[85vw] bg-white z-[201] shadow-2xl flex flex-col">

            {/* Header del panel */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-sky-100 flex-shrink-0">
              <span className="font-black text-sky-700 text-base">🎱 Bingo Familiar</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-muted-foreground hover:text-sky-700 rounded-lg hover:bg-sky-50"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* User info */}
            {profile && (
              <div className="px-4 py-4 border-b border-sky-50 flex items-center gap-3 flex-shrink-0">
                <Avatar className="h-10 w-10 ring-2 ring-sky-200 flex-shrink-0">
                  {avatarContent}
                </Avatar>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-800 truncate">{profile.username}</p>
                  <p className="text-xs text-muted-foreground">Jugador</p>
                </div>
              </div>
            )}

            {/* Nav links */}
            <nav className="flex-1 flex flex-col px-3 py-3 gap-0.5 overflow-y-auto">
              <Link
                href="/ranking"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100"
              >
                <span className="text-xl w-7 text-center">🏆</span> Ranking
              </Link>

              {profile && (
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100"
                >
                  <span className="text-xl w-7 text-center">👤</span> Mi perfil
                </Link>
              )}

              <div className="h-px bg-sky-100 my-2" />

              <p className="px-3 text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1">
                Redes sociales
              </p>

              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100"
              >
                <span className="text-xl w-7 text-center">📸</span> Instagram
              </a>

              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100"
              >
                <span className="text-xl w-7 text-center">📘</span> Facebook
              </a>

              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100"
              >
                <span className="text-xl w-7 text-center">💬</span> WhatsApp
              </a>
            </nav>

            {/* Logout */}
            {profile && (
              <div className="px-4 pb-8 pt-2 border-t border-sky-50 flex-shrink-0">
                <form action={logout}>
                  <Button
                    variant="ghost"
                    type="submit"
                    className="w-full text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </Button>
                </form>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
