// src/App.tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import type { SessionEvent, CalibrationProfile } from './db/db';
import { useRecording, type RecordingReadyData } from './hooks/useRecording';
import { requestPersistentStorage } from './hooks/useStoragePermission';
import { SpeechCapture } from './hooks/useSpeechCapture';
import { detectFillers } from './analysis/fillerDetector';
import { detectPauses, calculateWPM, calculateWPMWindows } from './analysis/pacing';
import Home from './pages/Home';
import SetupScreen from './components/SetupScreen/SetupScreen';
import RecordingScreen from './components/RecordingScreen/RecordingScreen';
import CalibrationScreen from './components/CalibrationScreen/CalibrationScreen';
import { NameSessionModal } from './components/NameSessionModal/NameSessionModal';
import ReviewPage from './pages/Review';
import HistoryView from './pages/HistoryView';

// State machine: home -> setup -> recording -> naming -> review
//                setup <-> history
//                setup <-> calibration
//                review -> history (back) | setup (record again)
type AppView = 'home' | 'setup' | 'recording' | 'processing' | 'naming' | 'review' | 'history' | 'calibration';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [historySessionId, setHistorySessionId] = useState<number | null>(null);
  const [pendingRecording, setPendingRecording] = useState<RecordingReadyData | null>(null);

  // SpeechCapture ref — does NOT trigger re-renders (useRef, not useState)
  const speechCaptureRef = useRef<SpeechCapture | null>(null);
  const sessionStartMsRef = useRef<number>(0);

  const sessionCount = useLiveQuery(() => db.sessions.count(), []);
  const hasExistingSessions = (sessionCount ?? 0) > 0;

  const calibrationProfile = useLiveQuery(
    () => db.calibrationProfiles.orderBy('id').last(),
    []
  ) as CalibrationProfile | undefined;

  // Skip welcome screen for returning users
  useEffect(() => {
    if (sessionCount !== undefined && sessionCount > 0 && view === 'home') {
      setView('setup');
    }
  }, [sessionCount, view]);

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
    stopSession();
    setView('processing');
  }, [stopSession]);

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
    });

    // REC-06: request persistent storage after first save
    await requestPersistentStorage();

    speechCaptureRef.current = null;
    setPendingRecording(null);
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
      />
    );
  }

  if (view === 'setup') {
    return (
      <SetupScreen
        onStart={handleStart}
        onViewHistory={hasExistingSessions ? () => setView('history') : undefined}
        onCalibrate={() => setView('calibration')}
        hasCalibration={calibrationProfile != null}
      />
    );
  }

  if (view === 'calibration') {
    return (
      <CalibrationScreen
        onComplete={handleCalibrationComplete}
        onCancel={() => setView('setup')}
      />
    );
  }

  if (view === 'recording') {
    return (
      <>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900 text-red-200 px-4 py-2 rounded-lg text-sm z-50">
            {error}
          </div>
        )}
        <RecordingScreen elapsedMs={elapsedMs} onStop={handleStop} />
      </>
    );
  }

  if (view === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c14] gap-4">
        <svg
          className="animate-spin w-8 h-8 text-[#6366f1]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="text-sm text-[#94a3b8]">Processing your recording...</p>
      </div>
    );
  }

  if (view === 'naming' && pendingRecording) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080c14]">
        <NameSessionModal
          autoTitle={pendingRecording.autoTitle}
          onConfirm={handleSaveName}
          onSkip={() => handleSaveName(pendingRecording.autoTitle)}
        />
      </div>
    );
  }

  if (view === 'review') {
    const sessionId = savedSessionId ?? historySessionId;
    if (sessionId === null) return null;
    return (
      <ReviewPage
        sessionId={sessionId}
        onRecordAgain={() => setView('setup')}
        onBack={historySessionId !== null ? () => {
          setHistorySessionId(null);
          setView('history');
        } : undefined}
      />
    );
  }

  if (view === 'history') {
    return (
      <HistoryView
        onOpenSession={(id) => {
          setHistorySessionId(id);
          setView('review');
        }}
        onRecordNew={() => setView('setup')}
      />
    );
  }

  return null;
}
