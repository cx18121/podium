// src/pages/Home.tsx
interface HomeProps {
  hasExistingSessions: boolean;
  onStart: () => void;
}

export default function Home({ hasExistingSessions, onStart }: HomeProps) {
  if (hasExistingSessions) {
    return null; // App routes returning users directly to setup
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c14] text-white gap-8 p-8 text-center max-w-3xl mx-auto w-full">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-[#f1f5f9]">Pitch Practice</h1>
        <div className="h-[2px] w-6 bg-[#6366f1] rounded-full" aria-hidden="true" />
      </div>
      <p className="text-[#94a3b8] text-lg max-w-md leading-relaxed">
        Record yourself practicing a talk. Get back annotated video with every filler word,
        eye contact break, and nervous gesture marked at the exact moment it happened.
      </p>
      <ul className="space-y-2 text-left max-w-xs">
        <li className="flex items-center gap-3 text-[#94a3b8] text-sm">
          <span className="w-1.5 h-4 bg-[#6366f1] rounded-full flex-shrink-0" aria-hidden="true" />
          Eye contact tracking
        </li>
        <li className="flex items-center gap-3 text-[#94a3b8] text-sm">
          <span className="w-1.5 h-4 bg-[#6366f1] rounded-full flex-shrink-0" aria-hidden="true" />
          Filler word detection (um, uh, like, you know)
        </li>
        <li className="flex items-center gap-3 text-[#94a3b8] text-sm">
          <span className="w-1.5 h-4 bg-[#6366f1] rounded-full flex-shrink-0" aria-hidden="true" />
          Pacing and pause analysis
        </li>
        <li className="flex items-center gap-3 text-[#94a3b8] text-sm">
          <span className="w-1.5 h-4 bg-[#6366f1] rounded-full flex-shrink-0" aria-hidden="true" />
          Facial expressiveness score
        </li>
        <li className="flex items-center gap-3 text-[#94a3b8] text-sm">
          <span className="w-1.5 h-4 bg-[#6366f1] rounded-full flex-shrink-0" aria-hidden="true" />
          Nervous gesture detection
        </li>
      </ul>
      <button
        onClick={onStart}
        className="px-8 h-[52px] bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold rounded-xl motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-2"
      >
        Start Recording
      </button>
      <p className="text-[#475569] text-[13px] tracking-wide">Runs entirely in your browser. Nothing is uploaded.</p>
    </div>
  );
}
