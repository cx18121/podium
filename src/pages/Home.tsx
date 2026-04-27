import { PrimaryButton } from '../components/common/PrimaryButton';

interface HomeProps {
  hasExistingSessions: boolean;
  onStart: () => void;
  onViewHistory: () => void;
}

export default function Home({ hasExistingSessions, onStart, onViewHistory }: HomeProps) {

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--color-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      position: 'relative',
    }}>
      {/* Subtle dot grid */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '28px',
        maxWidth: '440px',
        textAlign: 'center',
        animation: 'fade-up 0.4s ease-out both',
      }}>
        <h1 style={{
          fontWeight: 700,
          fontSize: 'clamp(2.5rem, 8vw, 4rem)',
          letterSpacing: '-0.05em',
          color: 'var(--color-text-primary)',
          lineHeight: 1,
          margin: 0,
        }}>
          Podium
        </h1>

        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '1rem',
          lineHeight: 1.65,
          maxWidth: '340px',
          margin: 0,
        }}>
          Record a practice session. Watch it back with every filler word, pause, and gesture marked in place.
        </p>

        <PrimaryButton size="lg" onClick={onStart}>Start Recording</PrimaryButton>

        {hasExistingSessions && (
          <button onClick={onViewHistory} className="btn-ghost" style={{ fontSize: '13px' }}>
            View past sessions
          </button>
        )}

        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '12px',
          margin: 0,
          letterSpacing: '0.01em',
        }}>
          Runs entirely in your browser — nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
