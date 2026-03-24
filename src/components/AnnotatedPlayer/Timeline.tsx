import { useState } from 'react';
import type { SessionEvent } from '../../db/db';
import { getNearestEvent } from './eventSync';

interface TimelineProps {
  events: SessionEvent[];
  durationMs: number;
  progressPct: number;
  currentTimeMs: number;
  onSeek: (timestampMs: number) => void;
}

function eventLabel(event: SessionEvent): string {
  if (event.type === 'filler_word') return `Filler word: "${event.label ?? ''}"`;
  if (event.type === 'eye_contact_break') return 'Eye contact break';
  if (event.type === 'eye_contact_resume') return 'Eye contact resumed';
  if (event.type === 'face_touch') return 'Face touch';
  if (event.type === 'body_sway') return 'Body sway';
  if (event.type === 'pause_detected') return `Pause: ${event.label ?? ''}`;
  if (event.type === 'expressiveness_segment') return `Expressiveness: ${event.label ?? ''}`;
  return event.type.replace(/_/g, ' ');
}

function markerBg(event: SessionEvent): string {
  if (event.type === 'filler_word') return '#fbbf24';
  if (event.type === 'eye_contact_break' || event.type === 'eye_contact_resume') return '#6366f1';
  if (event.type === 'face_touch' || event.type === 'body_sway') return '#ef4444';
  if (event.type === 'pause_detected') return '#94a3b8';
  return '#94a3b8';
}

function formatScrubTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function Timeline({ events, durationMs, progressPct, currentTimeMs, onSeek }: TimelineProps) {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [hoverMs, setHoverMs] = useState(0);

  if (durationMs <= 0) return null;

  const nearest = getNearestEvent(events, currentTimeMs);

  return (
    <div
      data-testid="timeline"
      role="progressbar"
      aria-valuenow={progressPct}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ position: 'relative', width: '100%', height: '48px', display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        onSeek(fraction * durationMs);
      }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setHoverPct(pct * 100);
        setHoverMs(pct * durationMs);
      }}
      onMouseLeave={() => setHoverPct(null)}
    >
      {/* Track */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        top: '50%', transform: 'translateY(-50%)',
        height: '6px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '9999px',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {/* Progress fill */}
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          background: 'linear-gradient(90deg, #6366f1, #818cf8)',
          borderRadius: '9999px',
          width: `${progressPct}%`,
          pointerEvents: 'none',
          boxShadow: '0 0 8px rgba(99,102,241,0.40)',
        }} />
      </div>

      {/* Hover ghost line + timestamp */}
      {hoverPct !== null && (
        <>
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${hoverPct}%`,
              top: 0, bottom: 0,
              width: '1px',
              background: 'rgba(255,255,255,0.20)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: `clamp(20px, calc(${hoverPct}% - 16px), calc(100% - 44px))`,
              padding: '3px 8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-modal)',
              color: 'var(--color-text-secondary)',
              fontSize: '11px',
              fontFamily: 'Figtree',
              borderRadius: '6px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {formatScrubTime(hoverMs)}
          </div>
        </>
      )}

      {events.map((event, i) => {
        const leftPct = (event.timestampMs / durationMs) * 100;
        const isNearest = nearest === event;
        return (
          <span key={i}>
            <button
              aria-label={eventLabel(event)}
              onMouseEnter={() => setTooltipIndex(i)}
              onMouseLeave={() => setTooltipIndex(null)}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(event.timestampMs);
              }}
              style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                left: `calc(${leftPct}% - 1.25px)`,
                width: '2.5px', height: '14px',
                borderRadius: '1px',
                backgroundColor: markerBg(event),
                opacity: isNearest ? 1 : 0.85,
                boxShadow: isNearest ? `0 0 6px ${markerBg(event)}88` : undefined,
                zIndex: 10,
                cursor: 'pointer',
                transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                padding: '12px',
                margin: '-12px',
                boxSizing: 'content-box',
              } as React.CSSProperties}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-1 hover:scale-y-[1.3]"
            />
            {tooltipIndex === i && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 4px)',
                  left: `clamp(0px, calc(${leftPct}% - 8px), calc(100% - 130px))`,
                  padding: '5px 10px',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-modal)',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                  fontFamily: 'Figtree',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                  whiteSpace: 'nowrap',
                  zIndex: 20,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                {eventLabel(event)}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
