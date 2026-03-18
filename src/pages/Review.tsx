import { useEffect, useState } from 'react';
import { db, type Session, type Scorecard, type WhisperFillerResult } from '../db/db';
import { aggregateScores, type ScorecardResult } from '../analysis/scorer';
import ScorecardView from '../components/ScorecardView/ScorecardView';
import AnnotatedPlayer from '../components/AnnotatedPlayer/AnnotatedPlayer';
import PauseDetail from '../components/PauseDetail/PauseDetail';
import FillerBreakdown from '../components/FillerBreakdown/FillerBreakdown';
import WPMChart from '../components/WPMChart/WPMChart';
import WhisperStatusBanner, { type WhisperBannerStatus } from '../components/WhisperStatusBanner/WhisperStatusBanner';
import { countFillersFromTranscript } from '../analysis/whisperFillerCounter';

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

  useEffect(() => {
    let objectUrl: string | null = null;
    db.sessions.get(sessionId).then(async (s) => {
      if (!s) { setError('Session not found.'); return; }
      objectUrl = URL.createObjectURL(s.videoBlob);
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
        setScorecard(result);
      } else {
        setScorecard(aggregateScores(s.eventLog, s.durationMs, s.transcript));
      }
    }).catch(() => setError('Could not load this session. Try recording a new one.'));

    return () => {
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

      {/* Whisper status banner — shown during downloading/pending, hidden on complete/failed */}
      <div style={{ width: '100%', maxWidth: '672px' }}>
        {whisperBannerStatus && (
          <WhisperStatusBanner status={whisperBannerStatus} downloadProgress={downloadProgress} />
        )}
      </div>

      <ScorecardView scorecard={scorecard} />

      <div style={{ width: '100%', maxWidth: '672px' }}>
        <PauseDetail events={session.eventLog} transcript={session.transcript} />
      </div>

      <div style={{ width: '100%', maxWidth: '672px' }}>
        <FillerBreakdown
          events={session.eventLog}
          durationMs={session.durationMs}
          whisperFillers={session.whisperFillers}
        />
      </div>

      <div style={{ width: '100%', maxWidth: '672px' }}>
        <WPMChart wpmWindows={session.wpmWindows} />
      </div>

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
