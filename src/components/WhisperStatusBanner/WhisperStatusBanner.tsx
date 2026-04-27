export type WhisperBannerStatus = 'downloading' | 'pending' | 'complete' | 'failed';

interface WhisperStatusBannerProps {
  status: WhisperBannerStatus;
  downloadProgress?: number;
}

export default function WhisperStatusBanner({ status, downloadProgress }: WhisperStatusBannerProps) {
  if (status === 'complete') return null;

  if (status === 'failed') {
    return (
      <div
        role="note"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '8px 12px',
          background: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          flexShrink: 0,
          lineHeight: 1.5,
        }}
      >
        <span aria-hidden="true" style={{ marginTop: '1px', flexShrink: 0 }}>·</span>
        <span>
          Transcription unavailable in this browser — eye contact, pacing, and gesture scores are unaffected.
        </span>
      </div>
    );
  }

  const message = status === 'downloading'
    ? `Downloading speech model${downloadProgress != null ? ` · ${Math.round(downloadProgress)}%` : ''}…`
    : 'Detecting filler words…';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        background: 'var(--color-surface-raised)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--color-text-muted)',
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden="true"
        className="animate-pulse"
        style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-text-muted)', flexShrink: 0 }}
      />
      <span>{message}</span>
    </div>
  );
}
