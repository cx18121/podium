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
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setPreviewError('Camera unavailable'));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  return (
    <div style={{ minHeight: '100svh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header — matches Review/History */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '52px',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
        }}>
          Podium
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <SpeechSupportBanner />
          {onViewHistory && (
            <button onClick={onViewHistory} className="btn-ghost">History</button>
          )}
          <button onClick={onCalibrate} className="btn-ghost">
            {hasCalibration ? 'Re-calibrate' : 'Calibrate'}
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        padding: '32px',
      }}>
        {/* Camera window */}
        <div style={{
          width: '100%',
          maxWidth: '480px',
          aspectRatio: '16/9',
          background: '#000',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {previewError ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>{previewError}</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay muted playsInline
              aria-label="Camera preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
          )}
        </div>

        <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', margin: 0 }}>
          {previewError
            ? 'Camera unavailable — audio will still be recorded.'
            : 'Check you\'re in frame, then start.'}
        </p>

        <PrimaryButton onClick={onStart}>Start Recording</PrimaryButton>
      </div>
    </div>
  );
}
