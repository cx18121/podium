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
  if (event.type === 'filler_word') return `Filler: "${event.label ?? ''}"`;
  if (event.type === 'eye_contact_break') return 'Eye contact break';
  if (event.type === 'eye_contact_resume') return 'Eye contact resumed';
  if (event.type === 'face_touch') return 'Face touch';
  if (event.type === 'body_sway') return 'Body sway';
  if (event.type === 'pause_detected') return `Pause: ${event.label ?? ''}`;
  if (event.type === 'expressiveness_segment') return `Expressiveness: ${event.label ?? ''}`;
  return event.type.replace(/_/g, ' ');
}

function markerColor(event: SessionEvent): string {
  if (event.type === 'filler_word') return '#f59e0b';
  if (event.type === 'eye_contact_break' || event.type === 'eye_contact_resume') return '#A8A29E';
  if (event.type === 'face_touch' || event.type === 'body_sway') return '#ef4444';
  if (event.type === 'pause_detected') return '#57534E';
  return '#57534E';
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
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
      style={{ position: 'relative', width: '100%', height: '40px', display: 'flex', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - rect.left) / rect.width) * durationMs);
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
        height: '3px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '9999px',
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          background: 'var(--color-text-secondary)',
          borderRadius: '9999px',
          width: `${progressPct}%`,
          pointerEvents: 'none',
        }} />
      </div>

      {/* Hover ghost */}
      {hoverPct !== null && (
        <>
          <div aria-hidden="true" style={{
            position: 'absolute',
            left: `${hoverPct}%`,
            top: 0, bottom: 0,
            width: '1px',
            background: 'rgba(255,255,255,0.15)',
            pointerEvents: 'none',
            zIndex: 5,
          }} />
          <div role="tooltip" style={{
            position: 'absolute',
            bottom: 'calc(100% + 4px)',
            left: `clamp(16px, calc(${hoverPct}% - 14px), calc(100% - 40px))`,
            padding: '2px 6px',
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)',
            fontSize: '10px',
            borderRadius: '5px',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 20,
          }}>
            {formatTime(hoverMs)}
          </div>
        </>
      )}

      {/* Event markers */}
      {events.map((event, i) => {
        const leftPct = (event.timestampMs / durationMs) * 100;
        const isNearest = nearest === event;
        return (
          <span key={i}>
            <button
              aria-label={eventLabel(event)}
              onMouseEnter={() => setTooltipIndex(i)}
              onMouseLeave={() => setTooltipIndex(null)}
              onClick={(e) => { e.stopPropagation(); onSeek(event.timestampMs); }}
              style={{
                position: 'absolute',
                top: '50%', transform: 'translateY(-50%)',
                left: `calc(${leftPct}% - 1.5px)`,
                width: '3px', height: isNearest ? '14px' : '10px',
                borderRadius: '1.5px',
                backgroundColor: markerColor(event),
                opacity: isNearest ? 1 : 0.7,
                zIndex: 10,
                cursor: 'pointer',
                transition: 'height 0.1s ease',
                padding: '10px',
                margin: '-10px',
                boxSizing: 'content-box' as const,
              }}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            />
            {tooltipIndex === i && (
              <div role="tooltip" style={{
                position: 'absolute',
                bottom: 'calc(100% + 4px)',
                left: `clamp(0px, calc(${leftPct}% - 8px), calc(100% - 120px))`,
                padding: '4px 8px',
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                fontSize: '11px',
                borderRadius: '6px',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 20,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              }}>
                {eventLabel(event)}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
