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

function getCurrentCaption(segments: TranscriptSegment[], currentTimeMs: number): string | null {
  const active = segments.filter(s => s.isFinal && s.timestampMs <= currentTimeMs).at(-1);
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

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      if (!videoRef.current) return;
      if (e.key === ' ') {
        e.preventDefault();
        videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 5);
      }
    }, []);

    return (
      <div
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', outline: 'none' }}
      >
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
              borderRadius: '10px',
              background: '#000',
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
              width: '44px', height: '44px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isPlaying ? (
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="white" viewBox="0 0 24 24" style={{ marginLeft: '2px' }} aria-hidden="true">
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

        {/* Timeline legend */}
        {events.length > 0 && (
          <div aria-hidden="true" style={{ display: 'flex', gap: '14px', marginTop: '-2px', flexWrap: 'wrap' }}>
            {([
              { label: 'Fillers', color: '#f59e0b' },
              { label: 'Eye contact', color: '#A8A29E' },
              { label: 'Physical', color: '#ef4444' },
              { label: 'Pauses', color: '#57534E' },
            ] as const).map(({ label, color }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.02em' }}>{label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Captions toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <button
            onClick={() => setShowCaptions(c => !c)}
            aria-label={showCaptions ? 'Hide captions' : 'Show captions'}
            aria-pressed={showCaptions}
            style={{
              alignSelf: 'flex-end',
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.04em',
              padding: '3px 8px',
              borderRadius: '5px',
              border: `1px solid ${showCaptions ? 'var(--color-border-hover)' : 'var(--color-border)'}`,
              background: showCaptions ? 'rgba(255,255,255,0.07)' : 'transparent',
              color: showCaptions ? 'var(--color-text-secondary)' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              minHeight: '28px',
            }}
            className="focus-ring"
          >
            CC
          </button>
          {showCaptions && (
            <div
              style={{
                width: '100%',
                minHeight: '36px',
                background: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(8px)',
                borderRadius: '7px',
                padding: '8px 14px',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-live="polite"
              aria-atomic="true"
            >
              {transcript === undefined ? (
                <span style={{ color: 'var(--color-text-muted)' }}>No transcript available</span>
              ) : (
                <span>{getCurrentCaption(transcript, currentTimeMs) ?? ''}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default AnnotatedPlayer;
