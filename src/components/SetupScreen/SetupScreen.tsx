// src/components/SetupScreen/SetupScreen.tsx
import { useEffect, useRef, useState } from 'react';
import SpeechSupportBanner from '../common/SpeechSupportBanner';

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
      background: '#060911',
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
          color: '#e4e9f5',
          margin: 0,
        }}>
          Podium
        </h1>
        <div style={{
          height: '2px', width: '28px',
          background: 'linear-gradient(90deg, #5b8fff, #00d4a8)',
          borderRadius: '2px',
        }} aria-hidden="true" />
      </div>

      <SpeechSupportBanner />

      {/* Camera preview */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        aspectRatio: '16/9',
        background: '#0b1022',
        border: '1px solid rgba(91,143,255,0.12)',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 40px rgba(91,143,255,0.06)',
      }}>
        {previewError ? (
          <p style={{
            color: '#5e6f94',
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
        color: '#5e6f94',
        fontSize: '13px',
        textAlign: 'center',
        maxWidth: '400px',
        lineHeight: 1.6,
        fontFamily: 'Figtree',
      }}>
        Check that you are in frame, then click Start Recording. The camera feed will be hidden during your session.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onStart}
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
            e.currentTarget.style.boxShadow = '0 6px 32px rgba(91,143,255,0.48)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 24px rgba(91,143,255,0.32)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        >
          Start Recording
        </button>

        {hasCalibration && (
          <span style={{
            fontSize: '11px',
            color: '#00d4a8',
            fontFamily: 'Figtree',
          }}>
            ✓ Calibrated
          </span>
        )}
      </div>

      {onViewHistory && (
        <button
          onClick={onViewHistory}
          style={{
            fontSize: '13px',
            color: '#5e6f94',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 16px',
            fontFamily: 'Figtree',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e9f5'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#5e6f94'; }}
        >
          → View History
        </button>
      )}

      <button
        onClick={onCalibrate}
        style={{
          fontSize: '13px',
          color: '#5e6f94',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 16px',
          fontFamily: 'Figtree',
          transition: 'color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e9f5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#5e6f94'; }}
      >
        {hasCalibration ? '↻ Re-calibrate' : '⚙ Calibrate for accuracy'}
      </button>
    </div>
  );
}
