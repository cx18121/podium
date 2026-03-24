import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { db, type Session, type Scorecard, type WhisperFillerResult } from '../db/db';
import { aggregateScores, type ScorecardResult } from '../analysis/scorer';
import ScorecardView from '../components/ScorecardView/ScorecardView';
import AnnotatedPlayer from '../components/AnnotatedPlayer/AnnotatedPlayer';
import type { AnnotatedPlayerHandle } from '../components/AnnotatedPlayer/AnnotatedPlayer';
import PauseDetail from '../components/PauseDetail/PauseDetail';
import FillerBreakdown from '../components/FillerBreakdown/FillerBreakdown';
import WhisperStatusBanner, { type WhisperBannerStatus } from '../components/WhisperStatusBanner/WhisperStatusBanner';

const WPMChart = lazy(() => import('../components/WPMChart/WPMChart'));
import { countFillersFromTranscript } from '../analysis/whisperFillerCounter';
import { computeWorstMoments } from '../analysis/worstMoments';
import WorstMomentsReel from '../components/WorstMomentsReel/WorstMomentsReel';

const HINT_KEY = 'podium-first-review-seen';

const HINTS = [
  {
    label: 'Scorecard',
    text: 'Your overall score and 6 dimensions — eye contact, fillers, pacing, expression, gestures, and opening/closing.',
    color: 'var(--color-accent)',
    bgColor: 'rgba(99,102,241,0.08)',
    borderColor: 'rgba(99,102,241,0.14)',
  },
  {
    label: 'Colored markers',
    text: 'Yellow and red marks on the timeline show filler words, pauses, and gestures — click any to jump.',
    color: 'var(--color-warning)',
    bgColor: 'rgba(251,191,36,0.07)',
    borderColor: 'rgba(251,191,36,0.14)',
  },
  {
    label: 'Worst Moments',
    text: 'Your top clips ranked by impact — jump straight to the moments worth replaying.',
    color: 'var(--color-destructive)',
    bgColor: 'rgba(239,68,68,0.07)',
    borderColor: 'rgba(239,68,68,0.14)',
  },
];

function FirstReviewHint() {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(HINT_KEY)
  );

  const dismiss = useCallback(() => {
    localStorage.setItem(HINT_KEY, '1');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      width: '100%',
      maxWidth: '672px',
      background: 'rgba(99,102,241,0.06)',
      border: '1px solid rgba(99,102,241,0.16)',
      borderRadius: '16px',
      padding: '16px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase' as const,
          color: 'rgba(99,102,241,0.7)',
        }}>
          First review — here's what you're looking at
        </span>
        <button
          onClick={dismiss}
          aria-label="Dismiss hint"
          className="btn-ghost"
          style={{ padding: '2px 4px', lineHeight: 1, fontSize: '16px' }}
        >
          ×
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
      }}>
        {HINTS.map((hint) => (
          <div key={hint.label} style={{
            background: hint.bgColor,
            border: `1px solid ${hint.borderColor}`,
            borderRadius: '10px',
            padding: '10px 12px',
          }}>
            <div style={{
              fontSize: '11px',
              fontWeight: 600,
              color: hint.color,
              marginBottom: '4px',
            }}>
              {hint.label}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
            }}>
              {hint.text}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

interface ReviewPageProps {
  sessionId: number;
  onRecordAgain: () => void;
  onBack?: () => void;
}

async function audioBlobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const pcm = audioBuffer.getChannelData(0);
  await audioContext.close();
  return pcm;
}

export default function ReviewPage({ sessionId, onRecordAgain, onBack }: ReviewPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whisperBannerStatus, setWhisperBannerStatus] = useState<WhisperBannerStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | undefined>(undefined);
  const playerRef = useRef<AnnotatedPlayerHandle>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;

    db.sessions.get(sessionId).then(async (s) => {
      if (!mounted) return;
      if (!s) { setError('Session not found.'); return; }

      objectUrl = URL.createObjectURL(s.videoBlob);
      if (!mounted) { URL.revokeObjectURL(objectUrl); return; }

      setVideoUrl(objectUrl);
      setSession(s);

      if (!s.scorecard) {
        const result = aggregateScores(s.eventLog, s.durationMs, s.transcript);
        const dbScorecard: Scorecard = {
          overall: result.overall,
          dimensions: Object.fromEntries(
            Object.entries(result.dimensions).map(([k, v]) => [k, v.score])
          ),
        };
        await db.sessions.update(s.id!, { scorecard: dbScorecard });
        if (!mounted) return;
        setScorecard(result);
      } else {
        setScorecard(aggregateScores(s.eventLog, s.durationMs, s.transcript));
      }
    }).catch(() => { if (mounted) setError('Could not load this session. Try recording a new one.'); });

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId]);

  // Whisper worker lifecycle: runs post-session, updates filler counts from ASR transcript
  useEffect(() => {
    if (!session) return;
    if (session.whisperStatus === 'complete') return;

    if (!window.crossOriginIsolated) {
      db.sessions.update(session.id!, { whisperStatus: 'failed' });
      setWhisperBannerStatus('failed');
      return;
    }

    const worker = new Worker(
      new URL('../workers/whisper.worker.ts', import.meta.url),
      { type: 'module' }
    );

    db.sessions.update(session.id!, { whisperStatus: 'pending' });
    setWhisperBannerStatus('pending');

    worker.onmessage = async (e) => {
      const msg = e.data;

      if (msg.type === 'progress') {
        if (msg.data?.status === 'progress' && msg.data.progress != null) {
          setWhisperBannerStatus('downloading');
          setDownloadProgress(msg.data.progress);
        }
      }

      if (msg.type === 'ready') {
        setWhisperBannerStatus('pending');
        setDownloadProgress(undefined);
        try {
          const pcm = await audioBlobToFloat32(session.videoBlob);
          worker.postMessage({ type: 'transcribe', audioData: pcm }, [pcm.buffer]);
        } catch {
          await db.sessions.update(session.id!, { whisperStatus: 'failed' });
          setWhisperBannerStatus('failed');
          worker.terminate();
        }
      }

      if (msg.type === 'result') {
        const byType = countFillersFromTranscript(msg.text);
        const whisperFillers: WhisperFillerResult = { byType };
        await db.sessions.update(session.id!, {
          whisperFillers,
          whisperStatus: 'complete',
        });
        // Re-read session to get updated data and trigger re-render
        const updated = await db.sessions.get(session.id!);
        if (updated) {
          setSession(updated);
          setScorecard(aggregateScores(updated.eventLog, updated.durationMs, updated.transcript));
        }
        setWhisperBannerStatus('complete');
        worker.terminate();
      }

      if (msg.type === 'error') {
        await db.sessions.update(session.id!, { whisperStatus: 'failed' });
        setWhisperBannerStatus('failed');
        worker.terminate();
      }
    };

    worker.onerror = async () => {
      await db.sessions.update(session.id!, { whisperStatus: 'failed' });
      setWhisperBannerStatus('failed');
      worker.terminate();
    };

    worker.postMessage({ type: 'init' });

    return () => worker.terminate();
  }, [session?.id, session?.whisperStatus]);

  if (error) {
    return (
      <div role="alert" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--color-bg)', color: 'var(--color-destructive)',
      }}>
        {error}
      </div>
    );
  }

  if (!session || !videoUrl) {
    return (
      <div aria-busy="true" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--color-bg)', color: 'var(--color-text-secondary)',
      }}>
        Loading session...
      </div>
    );
  }

  const durationSec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;

  const worstMoments = computeWorstMoments(session.eventLog, session.durationMs);

  return (
    <div
      className="px-4 py-6 sm:px-8 sm:py-10"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100svh',
        background: 'var(--color-bg)',
        gap: '28px',
        maxWidth: '768px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Session header */}
      <div style={{ width: '100%', maxWidth: '672px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.375rem',
          letterSpacing: '-0.025em',
          color: 'var(--color-text-primary)',
          margin: 0,
          overflowWrap: 'break-word',
          wordBreak: 'break-word',
        }}>
          {session.title || 'Untitled Session'}
        </h1>
        <p style={{
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          margin: 0,
        }}>
          {durationDisplay} · {new Date(session.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* First-review orientation hint */}
      <FirstReviewHint />

      {/* Whisper status banner */}
      <div style={{ width: '100%', maxWidth: '672px' }}>
        {whisperBannerStatus && (
          <WhisperStatusBanner status={whisperBannerStatus} downloadProgress={downloadProgress} />
        )}
      </div>

      {/* ── Section: Scorecard ── */}
      <ScorecardView scorecard={scorecard} />

      {/* ── Section: Analysis breakdown ── */}
      <div style={{ width: '100%', maxWidth: '672px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* PauseDetail + FillerBreakdown — side-by-side on sm+, stacked on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <PauseDetail events={session.eventLog} transcript={session.transcript} />
          <FillerBreakdown
            events={session.eventLog}
            durationMs={session.durationMs}
            whisperFillers={session.whisperFillers}
          />
        </div>
        {/* WPMChart full-width below */}
        <Suspense fallback={null}>
          <WPMChart wpmWindows={session.wpmWindows} />
        </Suspense>
      </div>

      {/* ── Section: Video review ── */}
      <div style={{ width: '100%', maxWidth: '672px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '20px' }}>
        <WorstMomentsReel moments={worstMoments} onSeek={(ms) => playerRef.current?.seekTo(ms)} />
        <AnnotatedPlayer
          ref={playerRef}
          videoUrl={videoUrl}
          durationMs={session.durationMs}
          events={session.eventLog}
          transcript={session.transcript}
        />
      </div>

      <PrimaryButton onClick={onRecordAgain}>Record Again</PrimaryButton>

      {onBack && (
        <button onClick={onBack} className="btn-ghost">Back to History</button>
      )}
    </div>
  );
}
