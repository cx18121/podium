// src/pages/Review.tsx
import { useEffect, useState } from 'react';
import { db, type Session } from '../db/db';

interface ReviewPageProps {
  sessionId: number;
  onRecordAgain: () => void;
}

export default function ReviewPage({ sessionId, onRecordAgain }: ReviewPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    db.sessions.get(sessionId).then((s) => {
      if (!s) { setError('Session not found.'); return; }
      setSession(s);
      setVideoUrl(URL.createObjectURL(s.videoBlob));
    });
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-red-400">
        {error}
      </div>
    );
  }

  if (!session || !videoUrl) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        Loading session...
      </div>
    );
  }

  const durationSec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-950 text-white p-8 gap-6">
      <h1 className="text-2xl font-bold">{session.title}</h1>
      <p className="text-gray-400 text-sm">{durationDisplay} · {session.createdAt.toLocaleDateString()}</p>

      <video
        src={videoUrl}
        controls
        className="w-full max-w-2xl rounded-xl bg-black"
        aria-label="Session playback"
      />

      <p className="text-gray-500 text-sm text-center max-w-md">
        Analysis and coaching events will appear here in Phase 2.
      </p>

      <button
        onClick={onRecordAgain}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-semibold transition-colors"
      >
        Record Another Session
      </button>
    </div>
  );
}
