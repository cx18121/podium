// src/App.tsx
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { SessionEvent, CalibrationProfile } from './db/db';
import { useRecording, type RecordingReadyData } from './hooks/useRecording';
import { requestPersistentStorage } from './hooks/useStoragePermission';
import { SpeechCapture } from './hooks/useSpeechCapture';
import { detectFillers } from './analysis/fillerDetector';
import { detectPauses, calculateWPM, calculateWPMWindows } from './analysis/pacing';
import Home from './pages/Home';
import { NameSessionModal } from './components/NameSessionModal/NameSessionModal';

const SetupScreen = lazy(() => import('./components/SetupScreen/SetupScreen'));
const RecordingScreen = lazy(() => import('./components/RecordingScreen/RecordingScreen'));
const CalibrationScreen = lazy(() => import('./components/CalibrationScreen/CalibrationScreen'));
const ReviewPage = lazy(() => import('./pages/Review'));
const HistoryView = lazy(() => import('./pages/HistoryView'));

function PageFallback() {
  return <div style={{ minHeight: '100svh', background: 'var(--color-bg)' }} />;
}

// State machine: home -> setup -> countdown -> recording -> naming -> review
//                setup <-> history
//                setup <-> calibration
//                review -> history (back) | setup (record again)
type AppView = 'home' | 'setup' | 'countdown' | 'recording' | 'processing' | 'naming' | 'review' | 'history' | 'calibration';

function CountdownView({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(3);
  const called = useRef(false);

  useEffect(() => {
    if (count === 0) {
      if (!called.current) { called.current = true; onDone(); }
      return;
    }
    const id = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [count, onDone]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100svh', background: 'var(--color-bg)', gap: '16px',
    }}>
      <span
        key={count}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '7rem',
          fontWeight: 700,
          letterSpacing: '-0.05em',
          color: 'var(--color-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
          animation: 'fade-up 0.25s ease-out both',
        } as React.CSSProperties}
      >
        {count > 0 ? count : ''}
      </span>
      <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
        Get ready
      </span>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [historySessionId, setHistorySessionId] = useState<number | null>(null);
  const [pendingRecording, setPendingRecording] = useState<RecordingReadyData | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);
  const processingDurationMsRef = useRef<number>(0);

  // SpeechCapture ref — does NOT trigger re-renders (useRef, not useState)
  const speechCaptureRef = useRef<SpeechCapture | null>(null);
  const sessionStartMsRef = useRef<number>(0);

  const sessionCount = useLiveQuery(() => db.sessions.count(), []);
  const hasExistingSessions = (sessionCount ?? 0) > 0;

  // Skip landing page for returning users
  useEffect(() => {
    if (sessionCount !== undefined && sessionCount > 0 && view === 'home') {
      setView('history');
    }
  }, [sessionCount, view]);

  const calibrationProfile = useLiveQuery(
    () => db.calibrationProfiles.orderBy('id').last(),
    []
  ) as CalibrationProfile | undefined;


  // Called by useRecording when blob is ready — transitions to naming prompt
  const handleRecordingReady = useCallback((data: RecordingReadyData) => {
    setPendingRecording(data);
    setView('naming');
  }, []);

  const { status, elapsedMs, error, startSession, stopSession } = useRecording(handleRecordingReady);

  const handleCalibrationComplete = useCallback(async (profile: { gazeThreshold: number; faceTouchThreshold: number; swayThreshold: number }) => {
    await db.calibrationProfiles.add({
      createdAt: new Date(),
      gazeThreshold: profile.gazeThreshold,
      faceTouchThreshold: profile.faceTouchThreshold,
      swayThreshold: profile.swayThreshold,
    });
    setView('setup');
  }, []);

  const handleStart = useCallback(async () => {
    setView('recording');
    speechCaptureRef.current = new SpeechCapture();
    sessionStartMsRef.current = Date.now();
    speechCaptureRef.current.start(sessionStartMsRef.current);
    await startSession(calibrationProfile ?? undefined);
  }, [startSession, calibrationProfile]);

  const handleStop = useCallback(() => {
    processingDurationMsRef.current = elapsedMs;
    stopSession();
    setView('processing');
  }, [stopSession, elapsedMs]);

  // App owns the save so naming prompt sits between stop and save (locked user decision)
  const handleSaveName = useCallback(async (title: string) => {
    if (!pendingRecording) return;
    const { fixedBlob, durationMs, visualEvents } = pendingRecording;

    // Stop speech capture and derive speech events
    const segments = speechCaptureRef.current?.stop() ?? [];
    const fillerEvents: SessionEvent[] = detectFillers(segments);
    const pauseEvents: SessionEvent[] = detectPauses(segments);
    const wpm = calculateWPM(segments, durationMs);
    const wpmWindows = calculateWPMWindows(segments, durationMs);
    // Store WPM as a single session-end event so Phase 3 scorer can read it
    const wpmEvent: SessionEvent = {
      type: 'wpm_snapshot',
      timestampMs: durationMs,
      label: `${wpm} wpm`,
    };
    const speechEvents: SessionEvent[] = [...fillerEvents, ...pauseEvents, wpmEvent];

    // Merge visual + speech events, sorted by timestamp
    const eventLog: SessionEvent[] = [
      ...(visualEvents ?? []),
      ...speechEvents,
    ].sort((a, b) => a.timestampMs - b.timestampMs);

    // REC-05: save with merged event log to IndexedDB
    const sessionId = await db.sessions.add({
      title,
      createdAt: new Date(),
      durationMs,
      videoBlob: fixedBlob,
      eventLog,
      scorecard: null,
      transcript: segments, // Phase 6: persist for caption display
      wpmWindows, // FOUND-02: 30-second window WPM data for Phase 12 chart
      prompt: pendingPrompt,
    });

    // REC-06: request persistent storage after first save
    await requestPersistentStorage();

    speechCaptureRef.current = null;
    setPendingRecording(null);
    setPendingPrompt(undefined);
    setSavedSessionId(sessionId as number);
    setView('review');
  }, [pendingRecording]);

  // status-driven fallback on error
  useEffect(() => {
    if (status === 'error' && (view === 'processing' || view === 'recording')) {
      setView('setup');
    }
  }, [status, view]);

  if (view === 'home') {
    return (
      <Home
        hasExistingSessions={hasExistingSessions}
        onStart={() => setView('setup')}
        onViewHistory={() => setView('history')}
      />
    );
  }

  if (view === 'setup') {
    return (
      <Suspense fallback={<PageFallback />}>
        <SetupScreen
          onStart={(prompt) => { setPendingPrompt(prompt); setView('countdown'); }}
          onViewHistory={hasExistingSessions ? () => setView('history') : undefined}
          onCalibrate={() => setView('calibration')}
          hasCalibration={calibrationProfile != null}
        />
      </Suspense>
    );
  }

  if (view === 'countdown') {
    return <CountdownView onDone={handleStart} />;
  }

  if (view === 'calibration') {
    return (
      <Suspense fallback={<PageFallback />}>
        <CalibrationScreen
          onComplete={handleCalibrationComplete}
          onCancel={() => setView('setup')}
        />
      </Suspense>
    );
  }

  if (view === 'recording') {
    return (
      <Suspense fallback={<PageFallback />}>
        <>
          {error && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900 text-red-200 px-4 py-2 rounded-lg text-sm z-50">
              {error}
            </div>
          )}
          <RecordingScreen elapsedMs={elapsedMs} onStop={handleStop} prompt={pendingPrompt} />
        </>
      </Suspense>
    );
  }

  if (view === 'processing') {
    const durSec = Math.round(processingDurationMsRef.current / 1000);
    const durMin = Math.floor(durSec / 60);
    const durLabel = durMin > 0
      ? `${durMin}m ${durSec % 60}s`
      : `${durSec}s`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', background: 'var(--color-bg)', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
            Saving your {durLabel} session
          </p>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
            This takes a few seconds
          </p>
        </div>
        <div style={{
          width: '160px',
          height: '2px',
          background: 'rgba(255,255,255,0.07)',
          borderRadius: '9999px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '40%',
            height: '100%',
            background: 'var(--color-accent)',
            borderRadius: '9999px',
            animation: 'progress-slide 1.4s cubic-bezier(0.4,0,0.2,1) infinite',
          }} />
        </div>
      </div>
    );
  }

  if (view === 'naming' && pendingRecording) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh', background: 'var(--color-bg)' }}>
        <NameSessionModal
          autoTitle={pendingRecording.autoTitle}
          onConfirm={handleSaveName}
        />
      </div>
    );
  }

  if (view === 'review') {
    const sessionId = savedSessionId ?? historySessionId;
    if (sessionId === null) return null;
    return (
      <Suspense fallback={<PageFallback />}>
        <ReviewPage
          sessionId={sessionId}
          onRecordAgain={() => setView('setup')}
          onViewHistory={() => { setHistorySessionId(null); setView('history'); }}
          onDeleted={() => { setSavedSessionId(null); setHistorySessionId(null); setView('history'); }}
          onBack={historySessionId !== null ? () => {
            setHistorySessionId(null);
            setView('history');
          } : undefined}
        />
      </Suspense>
    );
  }

  if (view === 'history') {
    return (
      <Suspense fallback={<PageFallback />}>
        <HistoryView
          onOpenSession={(id) => {
            setHistorySessionId(id);
            setView('review');
          }}
          onRecordNew={() => setView('setup')}
        />
      </Suspense>
    );
  }

  return null;
}
