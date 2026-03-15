import { useRef, useState, useCallback } from 'react';
import type { SessionEvent } from '../../db/db';
import Timeline from './Timeline';

interface AnnotatedPlayerProps {
  videoUrl: string;
  durationMs: number;
  events: SessionEvent[];
}

export default function AnnotatedPlayer({ videoUrl, durationMs, events }: AnnotatedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const ms = videoRef.current.currentTime * 1000;
    setCurrentTimeMs(ms);
    setProgressPct((videoRef.current.currentTime / videoRef.current.duration) * 100);
  }, []);

  const seekTo = useCallback((timestampMs: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timestampMs / 1000;
  }, []);

  const handleVideoClick = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl">
      <video
        ref={videoRef}
        src={videoUrl}
        onTimeUpdate={handleTimeUpdate}
        onClick={handleVideoClick}
        className="w-full max-w-2xl rounded-xl bg-black cursor-pointer"
        aria-label="Session playback"
      />
      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={progressPct}
        currentTimeMs={currentTimeMs}
        onSeek={seekTo}
      />
    </div>
  );
}
