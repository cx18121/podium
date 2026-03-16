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
      className="w-full bg-[#451a03] border-l-[3px] border-amber-400 text-amber-200 text-sm px-4 py-3 rounded-r-lg flex items-start justify-between gap-2"
    >
      <span>Audio analysis requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work.</span>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed(true)}
        className="text-amber-400 text-[13px] flex-shrink-0 -mx-[14px] -my-[14px] px-[14px] py-[14px] hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 focus-visible:outline-offset-1"
      >
        ×
      </button>
    </div>
  );
}
