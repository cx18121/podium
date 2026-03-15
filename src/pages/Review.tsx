import { useEffect, useState } from 'react';
import { db, type Session, type Scorecard } from '../db/db';
import { aggregateScores, type ScorecardResult } from '../analysis/scorer';
import ScorecardView from '../components/ScorecardView/ScorecardView';
import AnnotatedPlayer from '../components/AnnotatedPlayer/AnnotatedPlayer';

interface ReviewPageProps {
  sessionId: number;
  onRecordAgain: () => void;
}

export default function ReviewPage({ sessionId, onRecordAgain }: ReviewPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    db.sessions.get(sessionId).then(async (s) => {
      if (!s) { setError('Session not found.'); return; }
      objectUrl = URL.createObjectURL(s.videoBlob);
      setVideoUrl(objectUrl);
      setSession(s);

      if (!s.scorecard) {
        // First view: compute and persist (SCORE-03)
        const result = aggregateScores(s.eventLog, s.durationMs);
        const dbScorecard: Scorecard = {
          overall: result.overall,
          dimensions: Object.fromEntries(
            Object.entries(result.dimensions).map(([k, v]) => [k, v.score])
          ),
        };
        await db.sessions.update(s.id!, { scorecard: dbScorecard });
        setScorecard(result);
      } else {
        // Subsequent views: re-run aggregateScores to get rich DimensionScore objects
        // (stored Scorecard has only flat numbers; we need detail strings for display)
        setScorecard(aggregateScores(s.eventLog, s.durationMs));
      }
    }).catch(() => setError('Could not load session. Try recording again.'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId]);

  if (error) {
    return (
      <div role="alert" className="flex items-center justify-center min-h-screen bg-gray-950 text-red-400">
        {error}
      </div>
    );
  }

  if (!session || !videoUrl) {
    return (
      <div aria-busy="true" className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        Loading session...
      </div>
    );
  }

  const durationSec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-950 text-white p-8 gap-6">
      <h1 className="text-2xl font-bold">{session.title}</h1>
      <p className="text-sm text-gray-400">{durationDisplay} · {new Date(session.createdAt).toLocaleDateString()}</p>

      <ScorecardView scorecard={scorecard} />

      <AnnotatedPlayer
        videoUrl={videoUrl}
        durationMs={session.durationMs}
        events={session.eventLog}
      />

      <button
        onClick={onRecordAgain}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-colors"
      >
        Record Another Session
      </button>
    </div>
  );
}
