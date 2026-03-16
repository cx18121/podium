// src/components/SetupScreen/SetupScreen.tsx
import { useEffect, useRef, useState } from 'react';
import SpeechSupportBanner from '../common/SpeechSupportBanner';

interface SetupScreenProps {
  onStart: () => void;
  onViewHistory?: () => void;
}

export default function SetupScreen({ onStart, onViewHistory }: SetupScreenProps) {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c14] text-white gap-6 p-8 max-w-3xl mx-auto w-full">
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-xl font-semibold tracking-tight text-[#f1f5f9]">Pitch Practice</h1>
        <div className="h-[2px] w-6 bg-[#6366f1] rounded-full" aria-hidden="true" />
      </div>

      <SpeechSupportBanner />

      <div className="w-full max-w-lg aspect-video bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden flex items-center justify-center">
        {previewError ? (
          <p className="text-[#94a3b8] text-sm text-center px-4">{previewError}</p>
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

      <p className="text-[#94a3b8] text-sm text-center max-w-md">
        Check that you are in frame, then click Start Recording. The camera feed will be hidden during your session.
      </p>

      <button
        onClick={onStart}
        className="px-8 h-[52px] bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold rounded-xl motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-2"
      >
        Start Recording
      </button>
      {onViewHistory && (
        <button
          onClick={onViewHistory}
          className="text-sm text-[#94a3b8] hover:text-[#f1f5f9] transition-colors px-4 py-2"
        >
          → View History
        </button>
      )}
    </div>
  );
}
