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
        setScorecard(aggregateScores(s.eventLog, s.durationMs));
      }
    }).catch(() => setError('Could not load this session. Try recording a new one.'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId]);

  if (error) {
    return (
      <div role="alert" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: '#060911', color: '#f43f5e',
        fontFamily: 'Figtree',
      }}>
        {error}
      </div>
    );
  }

  if (!session || !videoUrl) {
    return (
      <div aria-busy="true" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: '#060911', color: '#5e6f94',
        fontFamily: 'Figtree',
      }}>
        Loading session...
      </div>
    );
  }

  const durationSec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100svh',
      background: '#060911',
      padding: '40px 32px',
      gap: '28px',
      maxWidth: '768px',
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Session header */}
      <div style={{ width: '100%', maxWidth: '672px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.375rem',
          letterSpacing: '-0.025em',
          color: '#e4e9f5',
          margin: 0,
        }}>
          {session.title}
        </h1>
        <p style={{
          fontSize: '13px',
          color: '#5e6f94',
          fontFamily: 'Figtree',
          margin: 0,
        }}>
          {durationDisplay} · {new Date(session.createdAt).toLocaleDateString()}
        </p>
      </div>

      <ScorecardView scorecard={scorecard} />

      <div style={{ width: '100%', maxWidth: '672px' }}>
        <AnnotatedPlayer
          videoUrl={videoUrl}
          durationMs={session.durationMs}
          events={session.eventLog}
          transcript={session.transcript}
        />
      </div>

      <button
        onClick={onRecordAgain}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-2"
        style={{
          padding: '0 36px',
          height: '52px',
          background: 'linear-gradient(135deg, #5b8fff 0%, #3d6ef7 100%)',
          color: 'white',
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontWeight: 600,
          fontSize: '15px',
          borderRadius: '14px',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(91,143,255,0.32)',
          transition: 'all 0.18s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 6px 32px rgba(91,143,255,0.50)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 24px rgba(91,143,255,0.32)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        Record Again
      </button>

      {onBack && (
        <button
          onClick={onBack}
          style={{
            fontSize: '13px',
            color: '#5e6f94',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 8px',
            fontFamily: 'Figtree',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e9f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#5e6f94'; }}
        >
          Back to History
        </button>
      )}
    </div>
  );
}
