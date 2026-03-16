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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#000] text-white gap-12">
      <div
        aria-live="polite"
        aria-label="Recording timer"
        className="text-5xl font-semibold tabular-nums text-[#f1f5f9] tracking-tight"
      >
        {formatElapsed(elapsedMs)}
      </div>

      <div className="flex items-center gap-3">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
        <span className="text-gray-400 text-sm tracking-widest uppercase">Recording</span>
      </div>

      <button
        onClick={onStop}
        className="px-10 h-[52px] bg-[#ef4444] hover:bg-[#f87171] text-white font-semibold rounded-xl motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef4444] focus-visible:outline-offset-2"
      >
        Stop Recording
      </button>
    </div>
  );
}
