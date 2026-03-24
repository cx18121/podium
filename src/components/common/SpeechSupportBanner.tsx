// src/components/common/SpeechSupportBanner.tsx
// AUD-05: Non-blocking warning when Web Speech API is unavailable.
import { useState } from 'react';

export default function SpeechSupportBanner() {
  const [dismissed, setDismissed] = useState(false);

  const isSupported =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  if (isSupported || dismissed) return null;

  return (
    <div
      role="status"
      style={{
        width: '100%',
        maxWidth: '560px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '11px 14px',
        background: 'rgba(251,191,36,0.07)',
        border: '1px solid rgba(251,191,36,0.18)',
        borderLeft: '2px solid var(--color-warning)',
        borderRadius: '10px',
      }}
    >
      <span style={{
        flex: 1,
        fontSize: '13px',
        color: 'var(--color-warning)',
        lineHeight: 1.6,
      }}>
        Speech recognition requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        style={{
          color: 'var(--color-warning)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 4px',
          flexShrink: 0,
          opacity: 0.6,
          transition: 'opacity 0.15s ease',
          fontFamily: 'system-ui',
        }}
        className="focus-ring"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
      >
        ×
      </button>
    </div>
  );
}
