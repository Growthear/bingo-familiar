import type { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'Políticas y Privacidad',
  description: 'Políticas de uso, privacidad y términos y condiciones de Bingo Familiar.',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-black text-sky-700">{title}</h2>
      <div className="text-sm text-gray-700 leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  )
}

export default function PoliticasPage() {
  const fecha = '27 de junio de 2026'

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 via-white to-sky-100">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 pb-16">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">📋</div>
          <h1 className="text-2xl font-black text-sky-700">Políticas y Privacidad</h1>
          <p className="text-xs text-muted-foreground mt-1">Última actualización: {fecha}</p>
        </div>

        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-6">

          <Section title="1. Sobre Bingo Familiar">
            <p>
              Bingo Familiar es una aplicación de entretenimiento diseñada para que grupos de personas puedan jugar al bingo de manera virtual, principalmente con fines recreativos y familiares.
            </p>
            <p>
              La aplicación es operada de manera independiente. Para consultas podés contactarnos a través de nuestras redes sociales (<strong>@augus_vidal</strong>).
            </p>
          </Section>

          <div className="h-px bg-sky-50" />

          <Section title="2. Uso de la aplicación">
            <p>Al utilizar Bingo Familiar aceptás que:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Sos mayor de 18 años o contás con autorización de un adulto responsable.</li>
              <li>Usarás la aplicación de manera responsable y con fines lícitos.</li>
              <li>No utilizarás la plataforma para actividades fraudulentas o que perjudiquen a otros usuarios.</li>
            </ul>
          </Section>

          <div className="h-px bg-sky-50" />

          <Section title="3. Partidas por dinero — Aviso importante">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="font-bold text-amber-800">⚠️ Leé esto antes de jugar por dinero</p>
              <p className="text-amber-700">
                Bingo Familiar <strong>no es una plataforma de apuestas</strong>. La opción de configurar un valor por cartón es una herramienta opcional pensada para que grupos privados (familia, amigos) organicen sus propias colectas recreativas.
              </p>
              <p className="text-amber-700">
                <strong>Bingo Familiar no interviene, no administra, no recauda ni garantiza ningún pago entre usuarios.</strong> Las transferencias de dinero ocurren directamente entre los jugadores y el host, fuera de la plataforma.
              </p>
              <p className="text-amber-700">
                La participación en partidas con apuesta económica es una <strong>decisión libre y voluntaria</strong> de cada usuario. Nadie está obligado a jugar por dinero — la aplicación puede usarse completamente gratis y por pura diversión.
              </p>
              <p className="text-amber-700">
                <strong>Bingo Familiar no se responsabiliza por pérdidas económicas, disputas de pago, incumplimientos entre usuarios ni ninguna consecuencia derivada del uso de la opción de precio por cartón.</strong>
              </p>
            </div>
          </Section>

          <div className="h-px bg-sky-50" />

          <Section title="4. Privacidad y datos personales">
            <p>Bingo Familiar recopila únicamente los datos necesarios para el funcionamiento de la aplicación:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>Correo electrónico:</strong> usado para crear y acceder a tu cuenta.</li>
              <li><strong>Nombre de usuario:</strong> visible para otros jugadores en la sala y en el ranking.</li>
              <li><strong>Foto de perfil:</strong> opcional, visible para otros jugadores.</li>
              <li><strong>Alias de Mercado Pago:</strong> opcional, visible únicamente para el host de la sala cuando hay precio por cartón.</li>
              <li><strong>Historial de partidas:</strong> resultados, premios ganados y estadísticas de juego.</li>
            </ul>
            <p>
              No compartimos tus datos con terceros ni los usamos con fines publicitarios. Los datos se almacenan de forma segura en Supabase.
            </p>
          </Section>

          <div className="h-px bg-sky-50" />

          <Section title="5. Limitación de responsabilidad">
            <p>
              Bingo Familiar se provee &quot;tal como está&quot;, sin garantías de ningún tipo. No nos responsabilizamos por interrupciones del servicio, pérdida de datos, o cualquier daño directo o indirecto que pueda surgir del uso de la aplicación.
            </p>
            <p>
              El usuario acepta que el uso de la aplicación es bajo su propio riesgo.
            </p>
          </Section>

          <div className="h-px bg-sky-50" />

          <Section title="6. Modificaciones">
            <p>
              Estas políticas pueden actualizarse en cualquier momento. Te notificaremos de cambios importantes a través de la aplicación. El uso continuado de Bingo Familiar después de cualquier cambio implica la aceptación de las nuevas condiciones.
            </p>
          </Section>

          <div className="h-px bg-sky-50" />

          <Section title="7. Contacto">
            <p>
              Para consultas, reclamos o solicitudes relacionadas con tu privacidad, contactanos por Instagram o X: <strong>@augus_vidal</strong>.
            </p>
          </Section>

        </div>
      </main>
    </div>
  )
}
