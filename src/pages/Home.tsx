// src/pages/Home.tsx
import { PrimaryButton } from '../components/common/PrimaryButton';

interface HomeProps {
  hasExistingSessions: boolean;
  onStart: () => void;
}

const STEPS = [
  {
    num: '01',
    title: 'Record',
    description: 'Deliver your pitch naturally. Podium watches your eye contact, pace, and gestures in real time.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="4" fill="#818cf8" />
        <circle cx="10" cy="10" r="7.5" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.5" />
        <circle cx="10" cy="10" r="9.5" stroke="#6366f1" strokeWidth="1" strokeOpacity="0.2" />
      </svg>
    ),
  },
  {
    num: '02',
    title: 'Analyze',
    description: 'Every filler word, hesitation, and nervous gesture is logged with a precise timestamp.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="13" width="3" height="5" rx="1" fill="#6366f1" fillOpacity="0.5" />
        <rect x="7" y="9" width="3" height="9" rx="1" fill="#6366f1" fillOpacity="0.7" />
        <rect x="12" y="5" width="3" height="13" rx="1" fill="#818cf8" />
        <path d="M3.5 11 7.5 7.5 12.5 4" stroke="#a5b4fc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    num: '03',
    title: 'Review',
    description: 'Watch back with every event annotated. See your score, then jump to your worst moments.',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="16" height="11" rx="2" stroke="#6366f1" strokeWidth="1.5" strokeOpacity="0.7" />
        <path d="M8 8l4 2.5L8 13V8z" fill="#818cf8" />
        <rect x="5" y="17" width="10" height="1.5" rx="0.75" fill="#6366f1" fillOpacity="0.4" />
      </svg>
    ),
  },
];

export default function Home({ hasExistingSessions, onStart }: HomeProps) {
  if (hasExistingSessions) {
    return null;
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden max-w-3xl mx-auto w-full px-8 py-16" style={{ background: 'var(--color-bg)' }}>

      {/* Aurora background orbs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <div style={{
          position: 'absolute',
          width: '700px', height: '700px',
          top: '-200px', left: '-180px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
          animation: 'aurora-drift-1 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '600px', height: '600px',
          bottom: '-160px', right: '-120px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 65%)',
          animation: 'aurora-drift-2 28s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: '500px', height: '500px',
          top: '50%', left: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)',
          animation: 'aurora-drift-3 34s ease-in-out infinite',
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
      </div>

      {/* Content */}
      <div className="relative flex flex-col items-center gap-10 text-center max-w-xl w-full">

        {/* Logo + wordmark */}
        <div className="flex flex-col items-center gap-4" style={{ animation: 'fade-up 0.55s ease-out both' }}>
          <div style={{
            width: '56px', height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(140deg, #818cf8 0%, #6366f1 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 36px rgba(99,102,241,0.30)',
          }} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8.5" r="5" fill="white" opacity="0.95" />
              <path d="M4 23c0-4.97 3.58-9 8-9s8 4.03 8 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" opacity="0.80" />
            </svg>
          </div>

          <h1 style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 800,
            fontSize: '3.75rem',
            letterSpacing: '-0.05em',
            lineHeight: 1.0,
            color: 'var(--color-text-primary)',
          }}>
            Podium
          </h1>

          <div style={{
            height: '2px', width: '48px',
            background: 'linear-gradient(90deg, #818cf8, #6366f1)',
            borderRadius: '2px',
          }} aria-hidden="true" />
        </div>

        {/* Tagline */}
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '1.0625rem',
          lineHeight: 1.7,
          maxWidth: '400px',
          animation: 'fade-up 0.55s 0.09s ease-out both',
        }}>
          Record a practice session. Watch it back with every filler word,
          eye contact break, and nervous gesture marked in place.
        </p>

        {/* How it works — 3-step flow */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full"
          style={{ maxWidth: '480px', animation: 'fade-up 0.55s 0.18s ease-out both' }}
          role="list"
          aria-label="How Podium works"
        >
          {STEPS.map((step, i) => (
            <div key={step.num} style={{ position: 'relative', display: 'flex' }} role="listitem">
              {/* Connector arrow — hidden on mobile (single-column) */}
              {i < STEPS.length - 1 && (
                <div aria-hidden="true" className="hidden sm:block" style={{
                  position: 'absolute',
                  right: '-7px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 1,
                  color: '#2d3a52',
                  fontSize: '14px',
                  lineHeight: 1,
                  pointerEvents: 'none',
                }}>›</div>
              )}
              <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '18px 16px 20px',
                borderRadius: '14px',
                background: 'rgba(99,102,241,0.05)',
                border: '1px solid rgba(99,102,241,0.12)',
                textAlign: 'left',
              }}>
                {/* Large background step number for depth */}
                <div aria-hidden="true" style={{
                  position: 'absolute',
                  top: '-6px', right: '6px',
                  fontSize: '76px',
                  fontFamily: 'Syne, system-ui, sans-serif',
                  fontWeight: 800,
                  color: 'rgba(99,102,241,0.08)',
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}>{step.num}</div>
                {step.icon}
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    marginBottom: '4px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.55,
                  }}>
                    {step.description}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ animation: 'fade-up 0.55s 0.27s ease-out both' }}>
          <PrimaryButton size="lg" onClick={onStart}>Start Recording</PrimaryButton>
        </div>

        {/* Privacy note */}
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '12px',
          letterSpacing: '0.04em',
          animation: 'fade-up 0.55s 0.35s ease-out both',
        }}>
          Runs entirely in your browser. Nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
