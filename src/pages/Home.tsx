// src/pages/Home.tsx
interface HomeProps {
  hasExistingSessions: boolean;
  onStart: () => void;
}

const FEATURES = [
  'Eye contact tracking',
  'Filler word detection (um, uh, like)',
  'Pacing & pause analysis',
  'Facial expressiveness score',
  'Nervous gesture detection',
];

export default function Home({ hasExistingSessions, onStart }: HomeProps) {
  if (hasExistingSessions) {
    return null;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#060911] text-white overflow-hidden max-w-3xl mx-auto w-full px-8 py-16">

      {/* Aurora background orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <div style={{
          position: 'absolute',
          width: '700px', height: '700px',
          top: '-200px', left: '-180px',
          background: 'radial-gradient(circle, rgba(91,143,255,0.11) 0%, transparent 65%)',
          animation: 'aurora-drift-1 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '600px', height: '600px',
          bottom: '-160px', right: '-120px',
          background: 'radial-gradient(circle, rgba(0,212,168,0.09) 0%, transparent 65%)',
          animation: 'aurora-drift-2 28s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '500px', height: '500px',
          top: '50%', left: '50%',
          background: 'radial-gradient(circle, rgba(91,143,255,0.05) 0%, transparent 60%)',
          animation: 'aurora-drift-3 34s ease-in-out infinite',
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-10 text-center max-w-xl w-full">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-3" style={{ animation: 'fade-up 0.55s ease-out both' }}>
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '15px',
            background: 'linear-gradient(140deg, #5b8fff 0%, #00d4a8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 36px rgba(91,143,255,0.32)',
          }} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8.5" r="5" fill="white" opacity="0.95" />
              <path d="M4 23c0-4.97 3.58-9 8-9s8 4.03 8 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.80" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '2.8rem',
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            color: '#e4e9f5',
          }}>
            Pitch Practice
          </h1>

          <div style={{
            height: '2px', width: '38px',
            background: 'linear-gradient(90deg, #5b8fff, #00d4a8)',
            borderRadius: '2px',
          }} aria-hidden="true" />
        </div>

        {/* Tagline */}
        <p style={{
          color: '#5e6f94',
          fontSize: '1.0625rem',
          lineHeight: 1.72,
          maxWidth: '400px',
          fontFamily: 'Figtree',
          animation: 'fade-up 0.55s 0.09s ease-out both',
        }}>
          Record a practice session. Get back annotated video with every filler word,
          eye contact break, and nervous gesture marked at the exact moment it happened.
        </p>

        {/* Feature list */}
        <ul style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          width: '100%',
          maxWidth: '440px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          animation: 'fade-up 0.55s 0.18s ease-out both',
        }}>
          {FEATURES.map((label) => (
            <li key={label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              padding: '9px 13px',
              borderRadius: '10px',
              background: 'rgba(91,143,255,0.04)',
              border: '1px solid rgba(91,143,255,0.10)',
              fontSize: '12.5px',
              color: '#7a8fb8',
              fontFamily: 'Figtree',
              textAlign: 'left',
            }}>
              <span style={{
                width: '5px', height: '5px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #5b8fff, #00d4a8)',
                flexShrink: 0,
                display: 'block',
              }} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div style={{ animation: 'fade-up 0.55s 0.27s ease-out both' }}>
          <button
            onClick={onStart}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-2"
            style={{
              padding: '0 40px',
              height: '54px',
              background: 'linear-gradient(135deg, #5b8fff 0%, #3d6ef7 100%)',
              color: 'white',
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: '15px',
              borderRadius: '14px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 28px rgba(91,143,255,0.38)',
              transition: 'all 0.18s ease',
              letterSpacing: '0.01em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #7ba7ff 0%, #5b8fff 100%)';
              e.currentTarget.style.boxShadow = '0 6px 36px rgba(91,143,255,0.55)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #5b8fff 0%, #3d6ef7 100%)';
              e.currentTarget.style.boxShadow = '0 4px 28px rgba(91,143,255,0.38)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px) scale(1)'; }}
          >
            Start Recording
          </button>
        </div>

        {/* Privacy note */}
        <p style={{
          color: '#363e55',
          fontSize: '12px',
          letterSpacing: '0.04em',
          fontFamily: 'Figtree',
          animation: 'fade-up 0.55s 0.35s ease-out both',
        }}>
          Runs entirely in your browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
