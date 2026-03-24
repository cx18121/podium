// src/components/RecordingScreen/RecordingScreen.tsx
// REC-02: Timer + stop button only. No camera feed. No other distractions.
// Camera hidden per locked user decision (CONTEXT.md).
interface RecordingScreenProps {
  elapsedMs: number;
  onStop: () => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export default function RecordingScreen({ elapsedMs, onStop }: RecordingScreenProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100svh',
      background: 'var(--color-bg)',
      gap: '48px',
    }}>
      {/* Timer */}
      <div
        aria-live="polite"
        aria-label="Recording timer"
        style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(4rem, 12vw, 7rem)',
          letterSpacing: '-0.05em',
          color: 'var(--color-text-primary)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        } as React.CSSProperties}
        className="tabular-nums"
      >
        {formatElapsed(elapsedMs)}
      </div>

      {/* Recording indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
        {/* Animated pulse rings */}
        <div style={{ position: 'relative', width: '12px', height: '12px' }} aria-hidden="true">
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--color-destructive)',
            animation: 'pulse-ring 1.6s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--color-destructive)',
            animation: 'pulse-ring 1.6s 0.5s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--color-destructive)',
            animation: 'rec-blink 1.2s ease-in-out infinite',
          }} />
        </div>
        <span style={{
          color: 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
        }}>
          Recording
        </span>
      </div>

      {/* Stop button */}
      <button
        onClick={onStop}
        className="btn-destructive btn-destructive-md focus-ring-destructive"
      >
        Stop Recording
      </button>
    </div>
  );
}
