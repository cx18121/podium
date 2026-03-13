// src/components/SetupScreen/SetupScreen.tsx
import { useEffect, useRef, useState } from 'react';
import SpeechSupportBanner from '../common/SpeechSupportBanner';

interface SetupScreenProps {
  onStart: () => void;
}

export default function SetupScreen({ onStart }: SetupScreenProps) {
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-6 p-8">
      <h1 className="text-3xl font-bold tracking-tight">Presentation Coach</h1>

      <SpeechSupportBanner />

      <div className="w-full max-w-lg aspect-video bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center">
        {previewError ? (
          <p className="text-gray-400 text-sm text-center px-4">{previewError}</p>
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

      <p className="text-gray-400 text-sm text-center max-w-md">
        Check that you are in frame, then click Start Recording. The camera feed will be hidden during your session.
      </p>

      <button
        onClick={onStart}
        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white text-lg font-semibold rounded-xl transition-colors"
      >
        Start Recording
      </button>
    </div>
  );
}
