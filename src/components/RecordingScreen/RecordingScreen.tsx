import { useEffect, useRef } from 'react';

interface RecordingScreenProps {
  elapsedMs: number;
  onStop: () => void;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
}

export default function RecordingScreen({ elapsedMs, onStop }: RecordingScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => { /* preview unavailable, recording still works */ });
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100svh',
      background: 'var(--color-bg)',
      gap: '36px',
      position: 'relative',
    }}>
      {/* Camera preview — centered */}
      <div style={{
        width: '100%',
        maxWidth: '360px',
        aspectRatio: '16/9',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        background: '#000',
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          aria-label="Camera preview"
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
        />
      </div>

      {/* Timer */}
      <div
        aria-live="polite"
        aria-label="Recording timer"
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          color: 'var(--color-text-muted)',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        } as React.CSSProperties}
      >
        {formatElapsed(elapsedMs)}
      </div>

      {/* Recording indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', width: '8px', height: '8px' }} aria-hidden="true">
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'var(--color-destructive)',
            animation: 'pulse-ring 1.6s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'var(--color-destructive)',
            animation: 'pulse-ring 1.6s 0.5s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'var(--color-destructive)',
            animation: 'rec-blink 1.2s ease-in-out infinite',
          }} />
        </div>
        <span style={{
          color: 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          Recording
        </span>
      </div>

      {/* Stop */}
      <button
        onClick={onStop}
        className="focus-ring"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 24px',
          height: '44px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '10px',
          color: 'var(--color-text-secondary)',
          fontSize: '0.875rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'border-color 0.15s ease, color 0.15s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--color-border)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
      >
        <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'currentColor', flexShrink: 0 }} aria-hidden="true" />
        Stop Recording
      </button>
    </div>
  );
}
