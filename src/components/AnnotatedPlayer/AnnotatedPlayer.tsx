import { useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { SessionEvent } from '../../db/db';
import type { TranscriptSegment } from '../../hooks/useSpeechCapture';
import Timeline from './Timeline';

interface AnnotatedPlayerProps {
  videoUrl: string;
  durationMs: number;
  events: SessionEvent[];
  transcript?: TranscriptSegment[];
}

export interface AnnotatedPlayerHandle {
  seekTo: (ms: number) => void;
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

const AnnotatedPlayer = forwardRef<AnnotatedPlayerHandle, AnnotatedPlayerProps>(
  function AnnotatedPlayer({ videoUrl, durationMs, events, transcript }, ref) {
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

  useImperativeHandle(ref, () => ({
    seekTo: (ms: number) => {
      if (videoRef.current) videoRef.current.currentTime = ms / 1000;
    },
  }));

  const handleVideoClick = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {/* Video */}
      <div style={{ position: 'relative', width: '100%' }} className="group">
        <video
          ref={videoRef}
          src={videoUrl}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{
            width: '100%',
            borderRadius: '14px',
            background: '#0b1022',
            cursor: 'pointer',
            display: 'block',
          }}
          aria-label="Session playback"
        />
        <button
          onClick={handleVideoClick}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        >
          <div style={{
            width: '52px', height: '52px',
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}>
            {isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24" style={{ marginLeft: '2px' }} aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
        </button>
      </div>

      <Timeline
        events={events}
        durationMs={durationMs}
        progressPct={progressPct}
        currentTimeMs={currentTimeMs}
        onSeek={seekTo}
      />

      {/* CC toggle + captions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => setShowCaptions(c => !c)}
          aria-label={showCaptions ? 'Hide captions' : 'Show captions'}
          aria-pressed={showCaptions}
          style={{
            alignSelf: 'flex-end',
            fontSize: '11px',
            fontFamily: 'Figtree',
            fontWeight: 600,
            letterSpacing: '0.04em',
            padding: '4px 10px',
            borderRadius: '6px',
            border: showCaptions
              ? '1px solid rgba(91,143,255,0.40)'
              : '1px solid rgba(255,255,255,0.06)',
            background: showCaptions ? 'rgba(91,143,255,0.15)' : 'rgba(255,255,255,0.03)',
            color: showCaptions ? '#7ba7ff' : '#5e6f94',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-1"
        >
          CC
        </button>
        {showCaptions && (
          <div
            style={{
              width: '100%',
              minHeight: '40px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '13px',
              color: '#e4e9f5',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'Figtree',
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            {transcript === undefined ? (
              <span style={{ color: '#363e55' }}>No transcript available</span>
            ) : (
              <span>{getCurrentCaption(transcript, currentTimeMs) ?? ''}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default AnnotatedPlayer;
