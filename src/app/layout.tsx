import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Bingo Familiar 🎱',
    template: '%s | Bingo Familiar',
  },
  description:
    'El bingo argentino para jugar con toda la familia. Creá tu sala, compartí el código y jugá desde el celular. Cartones, premios y diversión garantizada.',
  keywords: [
    'bingo familiar',
    'bingo online',
    'bingo argentino',
    'juego familiar',
    'jugar bingo',
    'bingo celular',
    'bingo gratis',
  ],
  authors: [{ name: 'Bingo Familiar', url: APP_URL }],
  creator: 'Bingo Familiar',
  openGraph: {
    type: 'website',
    locale: 'es_AR',
    url: APP_URL,
    siteName: 'Bingo Familiar',
    title: 'Bingo Familiar 🎱 — El bingo para jugar en familia',
    description:
      '¡Jugá al bingo con toda tu familia desde el celular! Creá una sala, compartí el código y a jugar. Cartones, premios y diversión garantizada. 🇦🇷',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Bingo Familiar — El bingo argentino para jugar en familia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bingo Familiar 🎱',
    description:
      'Creá tu sala, compartí el código y jugá al bingo desde el celular con toda la familia. ¡Premios y diversión garantizada! 🇦🇷',
    images: ['/opengraph-image'],
    creator: '@augus_vidal',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
