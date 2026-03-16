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
  const [isPlaying, setIsPlaying] = useState(false);

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
      <div className="relative group w-full max-w-2xl">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full rounded-xl bg-black cursor-pointer"
          aria-label="Session playback"
        />
        <button
          onClick={handleVideoClick}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          {isPlaying ? (
            <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
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
