import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cómo jugar',
  description: 'Aprendé a jugar al Bingo Familiar: cómo unirte a una sala, cómo marcar los números y cómo ser el host de la partida.',
}

function Section({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-black text-sky-700">{title}</h2>
      </div>
      <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-500 text-white text-xs font-black flex items-center justify-center mt-0.5">
        {n}
      </span>
      <p>{text}</p>
    </div>
  )
}

export default function ComoJugarPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">

        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🎱</div>
          <h1 className="text-2xl font-black text-sky-700">Cómo jugar</h1>
          <p className="text-sm text-muted-foreground mt-1">Todo lo que necesitás saber para jugar en familia</p>
        </div>

        <Section emoji="🙋" title="Unirse a una partida (Jugador)">
          <Step n={1} text="Pedile el código de 6 letras al host de la sala." />
          <Step n={2} text='Entrá a Bingo Familiar, tocá "Unirse a sala" e ingresá el código.' />
          <Step n={3} text="Esperá en la sala de espera a que el host inicie la partida." />
          <Step n={4} text="Si la partida es por dinero, transferile al host el monto por cartón a su alias de Mercado Pago (lo ves en la sala de espera)." />
          <Step n={5} text="Cuando empiece, marcá los números en tu cartón a medida que salen. Podés tener hasta 6 cartones." />
          <Step n={6} text='Cuando tengas terno, línea o bingo, tocá el botón correspondiente. ¡El sistema valida automáticamente si es correcto!' />
        </Section>

        <Section emoji="🎱" title="Cómo funciona el cartón">
          <p>El cartón de bingo tiene <strong>3 filas y 9 columnas</strong>. Cada fila tiene 5 números y 4 espacios vacíos. Los números van del 1 al 90.</p>
          <div className="bg-sky-50 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-sky-700">
              <span>Premio</span>
              <span>Condición</span>
              <span>% del pozo</span>
            </div>
            <div className="h-px bg-sky-200" />
            <div className="flex justify-between">
              <span>🎉 Terno</span>
              <span>3 números en línea</span>
              <span className="font-bold">10%</span>
            </div>
            <div className="flex justify-between">
              <span>🎯 Línea</span>
              <span>Fila completa</span>
              <span className="font-bold">30%</span>
            </div>
            <div className="flex justify-between">
              <span>🎱 Bingo</span>
              <span>Cartón completo</span>
              <span className="font-bold">60%</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Solo gana el primero que canta cada premio. Si cantás y no es válido, no pasa nada — intentá de nuevo.</p>
        </Section>

        <Section emoji="👑" title="Ser el host (Crear partida)">
          <Step n={1} text='Tocá "Crear sala" en la pantalla principal.' />
          <Step n={2} text="Configurá la velocidad de los números, cuántos cartones por jugador y si la partida es por dinero (precio por cartón)." />
          <Step n={3} text="Compartí el código de 6 letras con tu familia por WhatsApp o el medio que quieras." />
          <Step n={4} text="Cuando todos estén en la sala, tocá ¡Iniciar partida! Los números empiezan a salir automáticamente." />
          <Step n={5} text="Podés pausar la partida en cualquier momento (por ejemplo cuando alguien canta terno o línea) y reanudarla cuando estés listo." />
          <Step n={6} text="Cuando alguien canta bingo y es válido, la partida termina automáticamente. Podés iniciar otra partida desde la misma sala sin compartir un nuevo código." />
        </Section>

        <Section emoji="💳" title="Partidas por dinero">
          <p>Si el host configura un precio por cartón, el sistema calcula automáticamente el pozo total y los premios de cada categoría.</p>
          <p>Para que el host pueda recibir el pago sin pedirle el alias a cada jugador, conviene que <strong>el host cargue su alias de Mercado Pago en su perfil</strong> antes de crear la sala. Los jugadores lo van a ver en la sala de espera.</p>
          <p className="text-xs text-muted-foreground">Las transferencias son entre los jugadores y el host directamente — Bingo Familiar no interviene en el manejo del dinero.</p>
        </Section>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
          >
            🎱 ¡A jugar!
          </Link>
        </div>

      </main>
    </div>
  )
}
