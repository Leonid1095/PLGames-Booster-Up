import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PLGames Booster UP — игровой бустер нового поколения';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
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
          background: 'linear-gradient(135deg, #0A0A14 0%, #12121F 50%, #0A0A14 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: '#6C63FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <path d="M16 6l7 10h-4.5v10h-5V16H9l7-10z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontSize: 48, fontWeight: 800, color: 'white' }}>
            PLGames Booster UP
          </span>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 28, color: '#9999AA', marginBottom: 40 }}>
          Играй без лагов. Снижение пинга на 40%.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 48 }}>
          {[
            { value: '-40%', label: 'Пинг' },
            { value: '<15ms', label: 'До сервера' },
            { value: '50+', label: 'Игр' },
            { value: '7 дней', label: 'Бесплатно' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#6C63FF' }}>{stat.value}</span>
              <span style={{ fontSize: 16, color: '#9999AA', marginTop: 4 }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
