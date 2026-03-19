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
      background: '#02040a',
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
          color: '#e4e9f5',
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
            background: '#f43f5e',
            animation: 'pulse-ring 1.6s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#f43f5e',
            animation: 'pulse-ring 1.6s 0.5s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: '#f43f5e',
            animation: 'rec-blink 1.2s ease-in-out infinite',
          }} />
        </div>
        <span style={{
          color: 'rgba(255,255,255,0.30)',
          fontSize: '11px',
          fontFamily: 'Figtree, system-ui, sans-serif',
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
        style={{
          padding: '0 44px',
          height: '52px',
          background: 'rgba(244,63,94,0.12)',
          color: '#f43f5e',
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: '15px',
          borderRadius: '14px',
          border: '1px solid rgba(244,63,94,0.30)',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          letterSpacing: '0.01em',
        }}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f43f5e] focus-visible:outline-offset-2"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f43f5e';
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(244,63,94,0.40)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(244,63,94,0.12)';
          e.currentTarget.style.color = '#f43f5e';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Stop Recording
      </button>
    </div>
  );
}
