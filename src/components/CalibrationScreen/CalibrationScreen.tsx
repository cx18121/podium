import { useCallback, useEffect, useRef, useState } from 'react';
import workerUrl from '../../workers/mediapipe.worker.js?url';
import { computeCalibrationProfile } from '../../analysis/calibration';

interface CalibrationScreenProps {
  onComplete: (profile: { gazeThreshold: number; faceTouchThreshold: number; swayThreshold: number }) => void;
  onCancel: () => void;
}

type CalibrationStep = 'waiting' | 'gaze' | 'posture' | 'computing' | 'done';

const STEP_DURATION_MS = 15_000;
const FRAME_INTERVAL_MS = 150;

export default function CalibrationScreen({ onComplete, onCancel }: CalibrationScreenProps) {
  const [step, setStep] = useState<CalibrationStep>('waiting');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepStartEpochRef = useRef<number>(0);
  const stepRef = useRef<CalibrationStep>('waiting');
  const frameCountRef = useRef<number>(0);
  const calibrationDataRef = useRef<{
    gazeOffsets: number[];
    faceTouchDistances: number[];
    shoulderDeltas: number[];
  } | null>(null);

  useEffect(() => { stepRef.current = step; }, [step]);

  // Open camera preview immediately on mount so the user sees themselves before clicking Start
  useEffect(() => {
    let mounted = true;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then(stream => {
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => { /* preview unavailable */ });
    return () => { mounted = false; };
  }, []);

  const stopFramePump = useCallback(() => {
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
  }, []);

  const cleanup = useCallback(() => {
    stopFramePump();
    if (stepTimerRef.current) { clearInterval(stepTimerRef.current); stepTimerRef.current = null; }
    if (dotTimerRef.current) { clearInterval(dotTimerRef.current); dotTimerRef.current = null; }
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (hiddenVideoRef.current) { hiddenVideoRef.current.srcObject = null; hiddenVideoRef.current = null; }
  }, [stopFramePump]);

  const handleCancel = useCallback(() => { cleanup(); onCancel(); }, [cleanup, onCancel]);

  const startFramePump = useCallback((hidden: HTMLVideoElement) => {
    frameIntervalRef.current = setInterval(async () => {
      if (!workerRef.current || hidden.readyState < 2) return;
      try {
        const bitmap = await createImageBitmap(hidden);
        workerRef.current?.postMessage({ type: 'calibrate_frame', bitmap }, [bitmap]);
      } catch { /* skip */ }
    }, FRAME_INTERVAL_MS);
  }, []);

  const finishCalibration = useCallback(() => {
    stopFramePump();
    setStep('computing');
    stepRef.current = 'computing';
    if (!workerRef.current) return;
    const worker = workerRef.current;
    const onMsg = (e: MessageEvent) => {
      if (e.data.type === 'calibration_data') {
        worker.removeEventListener('message', onMsg);
        calibrationDataRef.current = {
          gazeOffsets: e.data.gazeOffsets,
          faceTouchDistances: e.data.faceTouchDistances,
          shoulderDeltas: e.data.shoulderDeltas,
        };
        const profile = computeCalibrationProfile(calibrationDataRef.current);
        cleanup();
        setStep('done');
        onComplete(profile);
      }
    };
    worker.addEventListener('message', onMsg);
    worker.postMessage({ type: 'calibrate_stop' });
  }, [stopFramePump, cleanup, onComplete]);

  const startGazeStep = useCallback((hidden: HTMLVideoElement) => {
    setStep('gaze');
    stepRef.current = 'gaze';
    stepStartEpochRef.current = Date.now();
    setElapsedMs(0);
    frameCountRef.current = 0;
    startFramePump(hidden);

    stepTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - stepStartEpochRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= STEP_DURATION_MS && stepRef.current === 'gaze') {
        clearInterval(stepTimerRef.current!);
        stepTimerRef.current = null;
        stepStartEpochRef.current = Date.now();
        setElapsedMs(0);
        setStep('posture');
        stepRef.current = 'posture';
        stepTimerRef.current = setInterval(() => {
          const el2 = Date.now() - stepStartEpochRef.current;
          setElapsedMs(el2);
          if (el2 >= STEP_DURATION_MS && stepRef.current === 'posture') {
            clearInterval(stepTimerRef.current!);
            stepTimerRef.current = null;
            finishCalibration();
          }
        }, 100);
      }
    }, 100);
  }, [startFramePump, finishCalibration]);

  const startCalibration = useCallback(async () => {
    try {
      // Reuse the preview stream opened on mount; request fresh only if it closed
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      }
      const stream = streamRef.current!;
      const hidden = document.createElement('video');
      hidden.srcObject = stream;
      hidden.muted = true;
      hidden.playsInline = true;
      await hidden.play();
      hiddenVideoRef.current = hidden;
      const worker = new Worker(workerUrl, { type: 'classic' });
      workerRef.current = worker;
      await new Promise<void>((resolve, reject) => {
        const onInit = (e: MessageEvent) => {
          if (e.data.type === 'ready') { worker.removeEventListener('message', onInit); resolve(); }
          else if (e.data.type === 'error') { worker.removeEventListener('message', onInit); reject(new Error(e.data.message)); }
        };
        worker.addEventListener('message', onInit);
        worker.postMessage({ type: 'init' });
      });
      dotTimerRef.current = setInterval(() => setDotCount(d => (d + 1) % 4), 400);
      startGazeStep(hidden);
    } catch { onCancel(); }
  }, [startGazeStep, onCancel]);

  const countdownSec = Math.max(0, Math.ceil((STEP_DURATION_MS - elapsedMs) / 1000));
  const dots = '.'.repeat(dotCount);

  const stepLabel = step === 'gaze' ? '1 of 2' : step === 'posture' ? '2 of 2' : '';
  const instruction = step === 'gaze' ? 'Look directly at the camera'
    : step === 'posture' ? 'Keep your hands at your sides'
    : step === 'computing' ? 'Computing calibration…'
    : '';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100svh', background: 'var(--color-bg)', gap: '20px', padding: '32px',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <h1 style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.02em', color: 'var(--color-text-primary)', margin: 0 }}>
          Calibration
        </h1>
        {stepLabel && (
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Step {stepLabel}
          </span>
        )}
      </div>

      {/* Camera preview */}
      <div style={{
        width: '100%', maxWidth: '520px', aspectRatio: '16/9',
        background: '#000', border: '1px solid var(--color-border)', borderRadius: '12px',
        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <video
          ref={videoRef} autoPlay muted playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          aria-label="Camera preview"
        />
        {(step === 'gaze' || step === 'posture') && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 500 }}>{instruction}</span>
            <span style={{ fontSize: '18px', color: 'var(--color-text-secondary)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{countdownSec}s</span>
          </div>
        )}
      </div>

      {step === 'waiting' && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center', maxWidth: '380px', lineHeight: 1.6, margin: 0 }}>
          Takes 30 seconds. Improves eye contact and gesture detection accuracy.
        </p>
      )}
      {(step === 'gaze' || step === 'posture') && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', margin: 0 }}>Collecting data{dots}</p>
      )}
      {step === 'computing' && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', margin: 0 }}>Computing{dots}</p>
      )}

      {step === 'waiting' && (
        <button onClick={startCalibration} className="btn-primary focus-ring">Start Calibration</button>
      )}
      <button onClick={handleCancel} className="btn-ghost focus-ring">Cancel</button>
    </div>
  );
}
