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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-12">
      <div
        aria-live="polite"
        aria-label="Recording timer"
        className="text-8xl font-mono font-light tabular-nums text-red-400"
      >
        {formatElapsed(elapsedMs)}
      </div>

      <div className="flex items-center gap-3">
        <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />
        <span className="text-gray-400 text-sm tracking-widest uppercase">Recording</span>
      </div>

      <button
        onClick={onStop}
        className="px-10 py-5 bg-gray-800 hover:bg-gray-700 text-white text-xl font-semibold rounded-2xl border border-gray-600 transition-colors"
      >
        Stop
      </button>
    </div>
  );
}
