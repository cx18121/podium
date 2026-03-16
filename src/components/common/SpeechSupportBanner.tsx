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
        background: 'rgba(245,158,11,0.07)',
        border: '1px solid rgba(245,158,11,0.18)',
        borderLeft: '3px solid #f59e0b',
        borderRadius: '10px',
      }}
    >
      <span style={{
        flex: 1,
        fontSize: '12.5px',
        color: '#d4a04a',
        fontFamily: 'Figtree, system-ui, sans-serif',
        lineHeight: 1.6,
      }}>
        Audio analysis requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work.
      </span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        style={{
          color: '#d4a04a',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '2px 4px',
          flexShrink: 0,
          opacity: 0.7,
          transition: 'opacity 0.15s ease',
          fontFamily: 'system-ui',
        }}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 focus-visible:outline-offset-1"
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; }}
      >
        ×
      </button>
    </div>
  );
}
