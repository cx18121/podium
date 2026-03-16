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
  if (event.type === 'filler_word') return '#fbbf24';          // amber-400
  if (event.type === 'eye_contact_break' || event.type === 'eye_contact_resume') return '#818cf8'; // indigo-400
  if (event.type === 'face_touch' || event.type === 'body_sway') return '#f87171'; // red-400
  if (event.type === 'pause_detected') return '#94a3b8';        // slate-400
  return '#94a3b8'; // default
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
      className="relative w-full h-12 flex items-center cursor-pointer select-none"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        onSeek(fraction * durationMs);
      }}
    >
      {/* 8px visual track */}
      <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-[#1a2235] rounded-full pointer-events-none">
        {/* Played portion fill */}
        <div
          className="absolute left-0 top-0 h-full bg-[#6366f1] rounded-full pointer-events-none"
          style={{ width: `${progressPct}%` }}
        />
      </div>

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
                "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full",
                "-mx-[14px] -my-[14px] px-[14px] py-[14px]",
                "z-10 focus:outline-none",
                "focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-1",
                "motion-safe:transition-transform motion-safe:duration-100 hover:scale-[1.3]",
                nearest === event ? "ring-2 ring-white scale-[1.3]" : "",
              ].join(" ")}
              style={{ left: `calc(${leftPct}% - 8px)`, backgroundColor: markerBg(event) }}
            />
            {tooltipIndex === i && (
              <div
                className="absolute bottom-full mb-2 px-2 py-1 bg-[#1a2235] border border-[rgba(255,255,255,0.10)] text-[#f1f5f9] text-[13px] rounded-lg pointer-events-none whitespace-nowrap z-20"
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
