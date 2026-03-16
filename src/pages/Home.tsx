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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-8 p-8 text-center max-w-3xl mx-auto w-full">
      <h1 className="text-xl font-semibold tracking-tight">Presentation Coach</h1>
      <p className="text-gray-300 text-lg max-w-md leading-relaxed">
        Record yourself practicing a talk. Get back annotated video with every filler word,
        eye contact break, and nervous gesture marked at the exact moment it happened.
      </p>
      <ul className="text-gray-400 text-sm space-y-2 text-left max-w-xs">
        <li>Eye contact tracking</li>
        <li>Filler word detection (um, uh, like, you know)</li>
        <li>Pacing and pause analysis</li>
        <li>Facial expressiveness score</li>
        <li>Nervous gesture detection</li>
      </ul>
      <button
        onClick={onStart}
        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white text-lg font-semibold rounded-xl transition-colors"
      >
        Start Recording
      </button>
      <p className="text-gray-500 text-xs">Runs entirely in your browser. Nothing is uploaded.</p>
    </div>
  );
}
