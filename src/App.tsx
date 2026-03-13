// src/App.tsx
import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/db';
import { useRecording, type RecordingReadyData } from './hooks/useRecording';
import { requestPersistentStorage } from './hooks/useStoragePermission';
import Home from './pages/Home';
import SetupScreen from './components/SetupScreen/SetupScreen';
import RecordingScreen from './components/RecordingScreen/RecordingScreen';
import { NameSessionModal } from './components/NameSessionModal/NameSessionModal';
import ReviewPage from './pages/Review';

// State machine: home -> setup -> recording -> naming -> review
//                                    |
//                                    v (on error)
//                                  setup
type AppView = 'home' | 'setup' | 'recording' | 'processing' | 'naming' | 'review';

export default function App() {
  const [view, setView] = useState<AppView>('home');
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [pendingRecording, setPendingRecording] = useState<RecordingReadyData | null>(null);

  const sessionCount = useLiveQuery(() => db.sessions.count(), []);
  const hasExistingSessions = (sessionCount ?? 0) > 0;

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

  const handleStart = useCallback(async () => {
    setView('recording');
    await startSession();
  }, [startSession]);

  const handleStop = useCallback(() => {
    stopSession();
    setView('processing');
  }, [stopSession]);

  // App owns the save so naming prompt sits between stop and save (locked user decision)
  const handleSaveName = useCallback(async (title: string) => {
    if (!pendingRecording) return;
    const { fixedBlob, durationMs } = pendingRecording;

    // REC-05: save with metadata to IndexedDB
    const sessionId = await db.sessions.add({
      title,
      createdAt: new Date(),
      durationMs,
      videoBlob: fixedBlob,
      eventLog: [],
      scorecard: null,
    });

    // REC-06: request persistent storage after first save
    await requestPersistentStorage();

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
    return <SetupScreen onStart={handleStart} />;
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
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        <p>Processing recording...</p>
      </div>
    );
  }

  if (view === 'naming' && pendingRecording) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <NameSessionModal
          autoTitle={pendingRecording.autoTitle}
          onConfirm={handleSaveName}
          onSkip={() => handleSaveName(pendingRecording.autoTitle)}
        />
      </div>
    );
  }

  if (view === 'review' && savedSessionId !== null) {
    return (
      <ReviewPage
        sessionId={savedSessionId}
        onRecordAgain={() => setView('setup')}
      />
    );
  }

  return null;
}
