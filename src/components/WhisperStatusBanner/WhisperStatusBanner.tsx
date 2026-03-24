// src/components/WhisperStatusBanner/WhisperStatusBanner.tsx
// WHIS-03, WHIS-04: Status banner for Whisper processing states on the Review page.
// Uses min-h-[44px] container to prevent layout shift (RESEARCH.md Pitfall 6).

export type WhisperBannerStatus = 'downloading' | 'pending' | 'complete' | 'failed';

interface WhisperStatusBannerProps {
  status: WhisperBannerStatus;
  downloadProgress?: number; // 0-100
}

export default function WhisperStatusBanner({ status, downloadProgress }: WhisperStatusBannerProps) {
  if (status === 'complete' || status === 'failed') return null;

  const message = status === 'downloading'
    ? `Downloading speech model (first time only)...${downloadProgress != null ? ` ${Math.round(downloadProgress)}%` : ''}`
    : 'Detecting filler words in your speech...';

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        width: '100%',
        minHeight: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '10px 16px',
        background: 'rgba(99,102,241,0.07)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: '12px',
        fontFamily: 'Figtree, system-ui, sans-serif',
        fontSize: '13px',
        color: 'var(--color-text-secondary)',
      }}
    >
      {/* Spinner dot */}
      <span
        aria-hidden="true"
        className="animate-pulse"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'var(--color-accent)',
        }}
      />
      <span>{message}</span>
    </div>
  );
}
