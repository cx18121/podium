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

export default function Timeline({ events, durationMs, progressPct, currentTimeMs, onSeek }: TimelineProps) {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);

  if (durationMs <= 0) return null;

  const nearest = getNearestEvent(events, currentTimeMs);

  return (
    <div
      data-testid="timeline"
      role="progressbar"
      aria-valuenow={progressPct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative w-full h-11 bg-gray-800 rounded-full cursor-pointer select-none"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        onSeek(fraction * durationMs);
      }}
    >
      <div
        className="absolute left-0 top-0 h-full bg-gray-600 rounded-full pointer-events-none"
        style={{ width: `${progressPct}%` }}
      />

      {events.map((event, i) => {
        const leftPct = (event.timestampMs / durationMs) * 100;
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
              className={[
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-400",
                "-mx-[14px] -my-[14px] px-[14px] py-[14px]",
                "z-10 hover:scale-150 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-300",
                nearest === event ? "ring-2 ring-amber-200 scale-125" : "",
              ].join(" ")}
              style={{ left: `calc(${leftPct}% - 8px)` }}
            />
            {tooltipIndex === i && (
              <div
                className="absolute bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded pointer-events-none whitespace-nowrap z-20 transition-opacity opacity-100"
                style={{ left: `clamp(0px, calc(${leftPct}% - 8px), calc(100% - 120px))` }}
                role="tooltip"
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
