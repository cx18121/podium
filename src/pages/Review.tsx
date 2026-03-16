import { useEffect, useState } from 'react';
import { db, type Session, type Scorecard } from '../db/db';
import { aggregateScores, type ScorecardResult } from '../analysis/scorer';
import ScorecardView from '../components/ScorecardView/ScorecardView';
import AnnotatedPlayer from '../components/AnnotatedPlayer/AnnotatedPlayer';

interface ReviewPageProps {
  sessionId: number;
  onRecordAgain: () => void;
  onBack?: () => void;
}

export default function ReviewPage({ sessionId, onRecordAgain, onBack }: ReviewPageProps) {
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
    }).catch(() => setError('Could not load this session. Try recording a new one.'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId]);

  if (error) {
    return (
      <div role="alert" className="flex items-center justify-center min-h-screen bg-[#080c14] text-red-400">
        {error}
      </div>
    );
  }

  if (!session || !videoUrl) {
    return (
      <div aria-busy="true" className="flex items-center justify-center min-h-screen bg-[#080c14] text-[#94a3b8]">
        Loading session...
      </div>
    );
  }

  const durationSec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#080c14] text-white p-8 gap-6 max-w-3xl mx-auto w-full">
      <h1 className="text-xl font-semibold">{session.title}</h1>
      <p className="text-sm text-[#94a3b8]">{durationDisplay} · {new Date(session.createdAt).toLocaleDateString()}</p>

      <ScorecardView scorecard={scorecard} />

      <AnnotatedPlayer
        videoUrl={videoUrl}
        durationMs={session.durationMs}
        events={session.eventLog}
        transcript={session.transcript}
      />

      <button
        onClick={onRecordAgain}
        className="px-6 h-[52px] bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold rounded-xl motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-2"
      >
        Record Again
      </button>
      {onBack && (
        <button
          onClick={onBack}
          className="text-sm text-[#94a3b8] hover:text-[#f1f5f9] motion-safe:transition-colors motion-safe:duration-150"
        >
          Back to History
        </button>
      )}
    </div>
  );
}
