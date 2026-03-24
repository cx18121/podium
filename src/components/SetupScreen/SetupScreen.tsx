// src/components/SetupScreen/SetupScreen.tsx
import { useEffect, useRef, useState } from 'react';
import SpeechSupportBanner from '../common/SpeechSupportBanner';
import { PrimaryButton } from '../common/PrimaryButton';

interface SetupScreenProps {
  onStart: () => void;
  onViewHistory?: () => void;
  onCalibrate: () => void;
  hasCalibration: boolean;
}

export default function SetupScreen({ onStart, onViewHistory, onCalibrate, hasCalibration }: SetupScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        setPreviewError('Camera preview unavailable — you can still start recording.');
      });
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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
      {/* Wordmark */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.025em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          Podium
        </h1>
        <div style={{
          height: '2px', width: '28px',
          background: 'linear-gradient(90deg, #818cf8, #6366f1)',
          borderRadius: '2px',
        }} aria-hidden="true" />
      </div>

      <SpeechSupportBanner />

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
      }}>
        {previewError ? (
          <p style={{
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '0 24px',
            fontFamily: 'Figtree',
          }}>
            {previewError}
          </p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
            aria-label="Camera preview"
          />
        )}
      </div>

      <p style={{
        color: 'var(--color-text-secondary)',
        fontSize: '13px',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: 1.6,
        fontFamily: 'Figtree',
      }}>
        Check that you are in frame, then click Start Recording. The camera feed will be hidden during your session.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <PrimaryButton onClick={onStart}>Start Recording</PrimaryButton>

        {hasCalibration && (
          <span style={{
            fontSize: '11px',
            color: 'var(--color-success)',
            fontFamily: 'Figtree',
          }}>
            ✓ Calibrated
          </span>
        )}
      </div>

      {onViewHistory && (
        <button onClick={onViewHistory} className="btn-ghost">→ View History</button>
      )}

      <button onClick={onCalibrate} className="btn-ghost">
        {hasCalibration ? '↻ Re-calibrate' : 'Calibrate for accuracy'}
      </button>
    </div>
  );
}
