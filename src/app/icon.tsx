import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
          border: '1.5px solid #b2ea0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow verde no canto */}
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: 'rgba(178,234,15,0.25)',
            filter: 'blur(4px)',
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: '#b2ea0f',
            letterSpacing: '-0.5px',
            lineHeight: 1,
            fontFamily: 'sans-serif',
          }}
        >
          SF
        </span>
      </div>
    ),
    { ...size }
  )
}
