// src/components/common/SpeechSupportBanner.tsx
// AUD-05: Non-blocking warning when Web Speech API is unavailable.
export default function SpeechSupportBanner() {
  const isSupported =
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

  if (isSupported) return null;

  return (
    <div
      role="status"
      className="w-full bg-yellow-900/60 border border-yellow-600 text-yellow-600 text-sm px-4 py-2 rounded-lg"
    >
      Audio analysis requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work.
    </div>
  );
}
