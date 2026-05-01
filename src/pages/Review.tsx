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

const FILLER_HIGHLIGHT = /\b(you know what|you know|kind of|sort of|i mean|um+|uh+|like|so|actually|basically|right|okay)\b/gi;

function highlightFillers(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  FILLER_HIGHLIGHT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = FILLER_HIGHLIGHT.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <mark key={key++} style={{
        background: 'rgba(245,158,11,0.15)',
        color: '#f59e0b',
        borderRadius: '3px',
        padding: '0 2px',
        fontStyle: 'inherit',
      }}>
        {m[0]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const SCORECARD_DIMS = [
  { key: 'eyeContact', label: 'Eye Contact' },
  { key: 'fillers', label: 'Filler Words' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'expressiveness', label: 'Expressiveness' },
  { key: 'gestures', label: 'Nervous Gestures' },
  { key: 'openingClosing', label: 'Opening / Closing' },
] as const;

function exportScorecard(scorecard: ScorecardResult, title: string) {
  const W = 480;
  const PADDING = 32;
  const HEADER_H = 140;
  const DIM_H = 50;
  const FOOTER_H = 44;
  const H = HEADER_H + SCORECARD_DIMS.length * DIM_H + FOOTER_H;
  const dpr = 2;

  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  function scoreToColor(s: number) {
    if (s >= 70) return '#10b981';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  }

  ctx.fillStyle = '#161614';
  ctx.fillRect(0, 0, W, H);

  // Watermark strip at top
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fillRect(0, 0, W, 40);

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('Podium', PADDING, 26);

  ctx.fillStyle = '#78716C';
  ctx.font = '400 11px system-ui, sans-serif';
  const dateStr = new Date().toLocaleDateString();
  ctx.fillText(dateStr, W - PADDING - ctx.measureText(dateStr).width, 26);

  // Session title
  ctx.fillStyle = '#A8A29E';
  ctx.font = '400 13px system-ui, sans-serif';
  ctx.fillText(title, PADDING, 68);

  // Overall score
  const overall = scorecard.overall;
  ctx.fillStyle = scoreToColor(overall);
  ctx.font = '700 52px system-ui, sans-serif';
  ctx.fillText(String(overall), PADDING, HEADER_H - 12);

  ctx.fillStyle = '#78716C';
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.fillText('OVERALL', PADDING + ctx.measureText(String(overall)).width + 10, HEADER_H - 26);

  // Separator
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, HEADER_H);
  ctx.lineTo(W - PADDING, HEADER_H);
  ctx.stroke();

  const BAR_W = W - PADDING * 2;
  let y = HEADER_H + 14;

  for (const { key, label } of SCORECARD_DIMS) {
    const dim = scorecard.dimensions[key];
    const sc = dim.score;
    const color = scoreToColor(sc);

    ctx.fillStyle = '#A8A29E';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText(label, PADDING, y + 14);

    if (dim.detail) {
      ctx.fillStyle = '#78716C';
      ctx.font = '400 12px system-ui, sans-serif';
      ctx.fillText(dim.detail, W - PADDING - ctx.measureText(dim.detail).width, y + 14);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.roundRect(PADDING, y + 22, BAR_W, 3, 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(PADDING, y + 22, BAR_W * (sc / 100), 3, 2);
    ctx.fill();

    y += DIM_H;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-scorecard.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
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
  const [notes, setNotes] = useState('');
  const playerRef = useRef<AnnotatedPlayerHandle>(null);

  useEffect(() => {
    if (session?.id != null) setNotes(session.notes ?? '');
  }, [session?.id]);

  const handleNotesSave = useCallback(async (value: string) => {
    await db.sessions.update(sessionId, { notes: value });
  }, [sessionId]);

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

          {/* Prompt — shown when session was recorded with one */}
          {session.prompt && (
            <section style={{ padding: '24px 28px', borderBottom: '1px solid var(--color-border)' }}>
              <p className="section-label">Prompt</p>
              <p style={{
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                lineHeight: 1.65,
                margin: 0,
              }}>
                {session.prompt}
              </p>
            </section>
          )}

          {/* Scorecard — lead section, generous top air */}
          <section style={{ padding: '32px 28px 28px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <p className="section-label" style={{ margin: 0 }}>Scorecard</p>
              {scorecard && (
                <button
                  onClick={() => exportScorecard(scorecard, session.title)}
                  className="btn-ghost"
                  style={{ fontSize: '11px' }}
                >
                  Export PNG
                </button>
              )}
            </div>
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
            const whisperText = session.whisperTranscript?.trim();
            const srText = session.transcript
              ?.filter(s => s.isFinal)
              .map(s => s.text.trim())
              .filter(Boolean)
              .map(s => {
                const cap = s.charAt(0).toUpperCase() + s.slice(1);
                return /[.!?,]$/.test(cap) ? cap : cap + '.';
              })
              .join(' ');
            const text = whisperText || srText;
            if (!text) return null;
            return (
              <section style={{ padding: '20px 28px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <p className="section-label" style={{ margin: 0 }}>Transcript</p>
                  {session.whisperTranscript && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.04em' }}>
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
                  {highlightFillers(text)}
                </p>
              </section>
            );
          })()}

          {/* Notes */}
          <section style={{ padding: '20px 28px', borderBottom: '1px solid var(--color-border)' }}>
            <p className="section-label">Notes</p>
            <textarea
              className="input-field"
              placeholder="Add notes about this session…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={e => handleNotesSave(e.target.value)}
              rows={3}
              style={{ resize: 'vertical', lineHeight: 1.65 }}
            />
          </section>

          {/* Delete — at the very end, below all content */}
          <div style={{ padding: '20px 28px 32px' }}>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-destructive-sm focus-ring-destructive"
            >
              Delete this session
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
