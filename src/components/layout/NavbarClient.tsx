'use client'

import { useState, useEffect } from 'react'
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

const INSTAGRAM_URL = 'https://instagram.com/augus_vidal'
const FACEBOOK_URL = 'https://facebook.com/augus_vidal'
const X_URL = 'https://x.com/augus_vidal'
const TIKTOK_URL = 'https://tiktok.com/@augus_vidal'

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconFacebook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconX({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconTikTok({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z" />
    </svg>
  )
}

export default function NavbarClient({ profile }: NavbarClientProps) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)

  const openMenu = () => {
    setOpen(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
  }

  const closeMenu = () => {
    setVisible(false)
    setTimeout(() => setOpen(false), 300)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

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
        onClick={openMenu}
        aria-label="Abrir menú"
      >
        <MenuIcon size={22} />
      </button>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      {open && createPortal(
        <>
          {/* Backdrop */}
          <div
            onClick={closeMenu}
            className={`fixed inset-0 bg-black/40 z-[200] transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Panel — slide desde la izquierda */}
          <div
            className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-white z-[201] shadow-2xl flex flex-col
              transition-transform duration-300 ease-in-out
              ${visible ? 'translate-x-0' : '-translate-x-full'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-sky-100 flex-shrink-0">
              <span className="font-black text-sky-700 text-base">🎱 Bingo Familiar</span>
              <button
                onClick={closeMenu}
                className="p-1.5 text-muted-foreground hover:text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
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
                onClick={closeMenu}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100 transition-colors"
              >
                <span className="text-xl w-7 text-center">🏆</span> Ranking
              </Link>

              {profile && (
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-sky-50 text-sm font-medium text-gray-700 active:bg-sky-100 transition-colors"
                >
                  <span className="text-xl w-7 text-center">👤</span> Mi perfil
                </Link>
              )}
            </nav>

            {/* Redes sociales + logout — siempre al fondo */}
            <div className="flex-shrink-0 border-t border-sky-50">
              {/* Íconos de redes */}
              <div className="px-4 pt-4 pb-3">
                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-3">
                  Redes sociales
                </p>
                <div className="flex items-center gap-2.5">
                  <a
                    href={INSTAGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <IconInstagram className="w-4 h-4" />
                  </a>
                  <a
                    href={FACEBOOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1877F2] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm"
                  >
                    <IconFacebook className="w-4 h-4" />
                  </a>
                  <a
                    href={X_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="X (Twitter)"
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-black text-white hover:opacity-80 active:scale-95 transition-all shadow-sm"
                  >
                    <IconX className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={TIKTOK_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    className="flex items-center justify-center w-9 h-9 rounded-xl bg-black text-white hover:opacity-80 active:scale-95 transition-all shadow-sm"
                  >
                    <IconTikTok className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Logout */}
              {profile && (
                <div className="px-4 pb-8 pt-1">
                  <form action={logout}>
                    <Button
                      variant="ghost"
                      type="submit"
                      className="w-full text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Cerrar sesión
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
