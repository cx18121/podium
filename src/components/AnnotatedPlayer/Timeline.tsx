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
  if (durationMs <= 0) return null;

  const nearest = getNearestEvent(events, currentTimeMs);

  return (
    <div
      data-testid="timeline"
      role="progressbar"
      aria-valuenow={progressPct}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative w-full h-8 bg-gray-800 rounded-full cursor-pointer select-none"
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
          <button
            key={i}
            title={eventLabel(event)}
            aria-label={eventLabel(event)}
            onClick={(e) => {
              e.stopPropagation();
              onSeek(event.timestampMs);
            }}
            className={[
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-amber-400",
              "hover:scale-150 transition-transform focus:outline-none focus:ring-2 focus:ring-amber-300",
              nearest === event ? "ring-2 ring-amber-200 scale-125" : "",
            ].join(" ")}
            style={{ left: `calc(${leftPct}% - 6px)` }}
          />
        );
      })}
    </div>
  );
}
