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
import { countFillersFromTranscript } from '../analysis/whisperFillerCounter';
import { computeWorstMoments } from '../analysis/worstMoments';
import WorstMomentsReel from '../components/WorstMomentsReel/WorstMomentsReel';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal/DeleteConfirmModal';

const WPMChart = lazy(() => import('../components/WPMChart/WPMChart'));

interface ReviewPageProps {
  sessionId: number;
  onRecordAgain: () => void;
  onBack?: () => void;
  onViewHistory?: () => void;
  onDeleted?: () => void;
}

async function audioBlobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const pcm = audioBuffer.getChannelData(0);
  await audioContext.close();
  return pcm;
}

export default function ReviewPage({ sessionId, onRecordAgain, onBack, onViewHistory, onDeleted }: ReviewPageProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [whisperBannerStatus, setWhisperBannerStatus] = useState<WhisperBannerStatus | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | undefined>(undefined);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
    }).catch(() => {
      if (mounted) setError('Could not load this session.');
    });

    return () => {
      mounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sessionId]);

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
        await db.sessions.update(session.id!, { whisperFillers, whisperStatus: 'complete', whisperTranscript: msg.text });
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
        fontSize: '14px',
      }}>
        {error}
      </div>
    );
  }

  if (!session || !videoUrl) {
    return (
      <div aria-busy="true" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--color-bg)', color: 'var(--color-text-muted)',
        fontSize: '13px',
      }}>
        Loading...
      </div>
    );
  }

  const durationSec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, '0')}`;
  const worstMoments = computeWorstMoments(session.eventLog, session.durationMs);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 24px',
        height: '52px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        {onBack && (
          <button onClick={onBack} className="btn-ghost" style={{ padding: '4px 0', marginRight: '4px' }}>
            ← Back
          </button>
        )}
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {session.title || 'Untitled Session'}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {durationDisplay} · {new Date(session.createdAt).toLocaleDateString()}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '8px', flexShrink: 0 }}>
          {onViewHistory && (
            <button onClick={onViewHistory} className="btn-ghost">History</button>
          )}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="btn-ghost focus-ring-destructive"
            aria-label="Delete session"
            title="Delete session"
            style={{ color: 'var(--color-text-muted)', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-destructive)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            Delete
          </button>
          <PrimaryButton size="sm" onClick={onRecordAgain}>Record Again</PrimaryButton>
        </div>
      </header>

      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={async () => {
            await db.sessions.delete(sessionId);
            setShowDeleteModal(false);
            onDeleted?.();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Split layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
        minHeight: 0,
      }} className="review-split">
        {/* Left: video */}
        <div style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          borderRight: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          height: 'calc(100svh - 52px)',
          overflow: 'hidden',
        }}>
          {whisperBannerStatus && (
            <WhisperStatusBanner status={whisperBannerStatus} downloadProgress={downloadProgress} />
          )}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', minHeight: 0 }}>
            <AnnotatedPlayer
              ref={playerRef}
              videoUrl={videoUrl}
              durationMs={session.durationMs}
              events={session.eventLog}
              transcript={session.transcript}
            />
          </div>
        </div>

        {/* Right: analysis panel */}
        <div style={{ overflowY: 'auto', height: 'calc(100svh - 52px)' }}>

          {/* Scorecard — lead section, generous top air */}
          <section style={{ padding: '32px 28px 28px', borderBottom: '1px solid var(--color-border)' }}>
            <p className="section-label">Scorecard</p>
            <ScorecardView scorecard={scorecard} />
          </section>

          {/* Worst moments — second priority, same horizontal rhythm */}
          {worstMoments && (
            <section style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-border)' }}>
              <WorstMomentsReel
                moments={worstMoments}
                onSeek={(ms) => playerRef.current?.seekTo(ms)}
              />
            </section>
          )}

          {/* Pause + Filler — supporting detail, slightly tighter */}
          <section style={{
            padding: '20px 28px',
            borderBottom: '1px solid var(--color-border)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
          }}>
            <PauseDetail events={session.eventLog} transcript={session.transcript} />
            <FillerBreakdown
              events={session.eventLog}
              durationMs={session.durationMs}
              whisperFillers={session.whisperFillers}
            />
          </section>

          {/* WPM chart — supporting detail */}
          <section style={{ padding: '20px 28px', borderBottom: '1px solid var(--color-border)' }}>
            <Suspense fallback={null}>
              <WPMChart wpmWindows={session.wpmWindows} />
            </Suspense>
          </section>

          {/* Transcript — reference material, tightest weight */}
          {(() => {
            const text = session.whisperTranscript?.trim() ||
              session.transcript
                ?.filter(s => s.isFinal)
                .map(s => s.text.trim())
                .filter(Boolean)
                .join(' ');
            if (!text) return null;
            return (
              <section style={{ padding: '20px 28px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <p className="section-label" style={{ margin: 0 }}>Transcript</p>
                  {session.whisperTranscript && (
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
                      Whisper
                    </span>
                  )}
                </div>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.75,
                  margin: 0,
                }}>
                  {text}
                </p>
              </section>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
