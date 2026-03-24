// src/components/CalibrationScreen/CalibrationScreen.tsx
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

  // Keep stepRef in sync
  useEffect(() => { stepRef.current = step; }, [step]);

  const stopFramePump = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
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

  const handleCancel = useCallback(() => {
    cleanup();
    onCancel();
  }, [cleanup, onCancel]);

  const startFramePump = useCallback((hidden: HTMLVideoElement) => {
    frameIntervalRef.current = setInterval(async () => {
      if (!workerRef.current) return;
      if (hidden.readyState < 2) return;
      try {
        const bitmap = await createImageBitmap(hidden);
        workerRef.current?.postMessage(
          { type: 'calibrate_frame', bitmap },
          [bitmap]
        );
      } catch {
        // silently skip
      }
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

    if (workerRef.current) {
      const worker = workerRef.current;
      const onAck = (e: MessageEvent) => {
        if (e.data.type === 'calibrate_frame_ack') {
          frameCountRef.current += 1;
        }
      };
      worker.addEventListener('message', onAck);
    }

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

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
          if (e.data.type === 'ready') {
            worker.removeEventListener('message', onInit);
            resolve();
          } else if (e.data.type === 'error') {
            worker.removeEventListener('message', onInit);
            reject(new Error(e.data.message));
          }
        };
        worker.addEventListener('message', onInit);
        worker.postMessage({ type: 'init' });
      });

      dotTimerRef.current = setInterval(() => {
        setDotCount(d => (d + 1) % 4);
      }, 400);

      startGazeStep(hidden);
    } catch {
      onCancel();
    }
  }, [startGazeStep, onCancel]);

  const countdownSec = Math.max(0, Math.ceil((STEP_DURATION_MS - elapsedMs) / 1000));

  const stepLabel = step === 'gaze'
    ? 'Step 1 of 2'
    : step === 'posture'
    ? 'Step 2 of 2'
    : '';

  const instruction = step === 'gaze'
    ? 'Look directly at the camera'
    : step === 'posture'
    ? 'Keep your hands at your sides'
    : step === 'computing'
    ? 'Computing your calibration...'
    : '';

  const dots = '.'.repeat(dotCount);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100svh',
      background: 'var(--color-bg)',
      gap: '24px',
      padding: '32px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.025em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          Calibration
        </h1>
        <div style={{
          height: '2px', width: '28px',
          background: 'linear-gradient(90deg, #818cf8, #6366f1)',
          borderRadius: '2px',
        }} aria-hidden="true" />
      </div>

      {/* Step indicator */}
      {stepLabel && (
        <p style={{
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontSize: '12px',
          color: 'var(--color-accent)',
          margin: 0,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {stepLabel}
        </p>
      )}

      {/* Camera preview */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        aspectRatio: '16/9',
        background: 'var(--color-surface)',
        border: '1px solid rgba(99,102,241,0.10)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 40px rgba(99,102,241,0.05)',
        position: 'relative',
      }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          aria-label="Camera preview"
        />
        {/* Instruction overlay */}
        {(step === 'gaze' || step === 'posture') && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(8,12,20,0.80)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              fontWeight: 600,
            }}>
              {instruction}
            </span>
            <span style={{
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontSize: '20px',
              color: 'var(--color-accent)',
              fontWeight: 700,
              minWidth: '32px',
              textAlign: 'right',
            }}>
              {countdownSec}s
            </span>
          </div>
        )}
      </div>

      {/* Instruction / status text */}
      {step === 'waiting' && (
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          textAlign: 'center',
          maxWidth: '400px',
          lineHeight: 1.6,
          fontFamily: 'Figtree',
          margin: 0,
        }}>
          Calibration takes 30 seconds and improves detection accuracy for your face and posture.
          Make sure you're well-lit and centered in the frame.
        </p>
      )}

      {(step === 'gaze' || step === 'posture') && (
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '12px',
          fontFamily: 'Figtree',
          margin: 0,
        }}>
          Collecting data{dots}
        </p>
      )}

      {step === 'computing' && (
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          fontFamily: 'Figtree',
          margin: 0,
        }}>
          Computing your calibration{dots}
        </p>
      )}

      {/* Actions */}
      {step === 'waiting' && (
        <button
          onClick={startCalibration}
          className="btn-primary btn-primary-lg focus-ring"
        >
          Start Calibration
        </button>
      )}

      <button
        onClick={handleCancel}
        className="btn-ghost focus-ring"
      >
        Cancel
      </button>
    </div>
  );
}
