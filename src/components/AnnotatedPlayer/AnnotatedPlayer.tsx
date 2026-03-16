import { useRef, useState, useCallback } from 'react';
import type { SessionEvent } from '../../db/db';
import type { TranscriptSegment } from '../../hooks/useSpeechCapture';
import Timeline from './Timeline';

interface AnnotatedPlayerProps {
  videoUrl: string;
  durationMs: number;
  events: SessionEvent[];
  transcript?: TranscriptSegment[]; // Phase 6: for live caption display
}

function getCurrentCaption(
  segments: TranscriptSegment[],
  currentTimeMs: number
): string | null {
  const active = segments
    .filter(s => s.isFinal && s.timestampMs <= currentTimeMs)
    .at(-1);
  return active?.text ?? null;
}

export default function AnnotatedPlayer({ videoUrl, durationMs, events, transcript }: AnnotatedPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [progressPct, setProgressPct] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);

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
          className="w-full rounded-xl bg-[#111827] cursor-pointer"
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

      {/* CC toggle and caption bar */}
      <div className="flex flex-col gap-1">
        <button
          onClick={() => setShowCaptions(c => !c)}
          className={[
            "self-end text-xs px-2 py-1 rounded font-semibold",
            "motion-safe:transition-colors motion-safe:duration-150",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-1",
            showCaptions
              ? "bg-[#6366f1] text-white"
              : "bg-[#1a2235] hover:bg-[#111827] text-[#94a3b8] border border-[rgba(255,255,255,0.07)]",
          ].join(" ")}
          aria-label={showCaptions ? 'Hide captions' : 'Show captions'}
          aria-pressed={showCaptions}
        >
          CC
        </button>
        {showCaptions && (
          <div
            className="w-full min-h-[2.5rem] bg-[rgba(0,0,0,0.7)] rounded px-4 py-2 text-sm text-[#f1f5f9] text-center flex items-center justify-center"
            aria-live="polite"
            aria-atomic="true"
          >
            {transcript === undefined ? (
              <span className="text-[#475569]">No transcript available</span>
            ) : (
              <span>{getCurrentCaption(transcript, currentTimeMs) ?? ''}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
