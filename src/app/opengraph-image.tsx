import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 55%, #38bdf8 100%)',
        }}
      >
        {/* Card central */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'white',
            borderRadius: '40px',
            padding: '56px 88px',
            gap: '18px',
          }}
        >
          {/* Emoji + título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '80px', lineHeight: 1 }}>🎱</span>
            <span
              style={{
                fontSize: '68px',
                fontWeight: 900,
                color: '#0369a1',
                letterSpacing: '-2px',
                lineHeight: 1,
              }}
            >
              Bingo Familiar
            </span>
          </div>

          {/* Subtítulo */}
          <span
            style={{
              fontSize: '30px',
              color: '#64748b',
              textAlign: 'center',
              lineHeight: 1.3,
            }}
          >
            El bingo argentino para jugar con toda la familia 🇦🇷
          </span>
        </div>

        {/* Tagline inferior */}
        <div
          style={{
            position: 'absolute',
            bottom: '36px',
            display: 'flex',
            gap: '12px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            letterSpacing: '0.5px',
          }}
        >
          <span>Creá tu sala</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span>Compartí el código</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span>¡A jugar!</span>
        </div>
      </div>
    ),
    size,
  )
}
