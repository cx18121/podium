import type { CSSProperties } from 'react';
import type { Session } from '../../db/db';

interface SessionListItemProps {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}

function scoreBadgeStyle(scorecard: Session['scorecard']): CSSProperties {
  if (scorecard === null) return { backgroundColor: 'rgba(148,163,184,0.15)', color: '#94a3b8' };
  const s = scorecard.overall;
  if (s >= 70) return { backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981' };
  if (s >= 40) return { backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24' };
  return { backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' };
}

export function SessionListItem({ session, onOpen, onDelete }: SessionListItemProps) {
  const dateDisplay = new Date(session.createdAt).toLocaleDateString();
  const sec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const scoreDisplay = session.scorecard === null ? '—' : session.scorecard.overall;

  return (
    <div
      onClick={onOpen}
      className="bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl px-4 py-4 flex items-center gap-4 cursor-pointer motion-safe:transition-colors motion-safe:duration-150 hover:bg-[#1a2235] hover:border-[rgba(255,255,255,0.12)]"
    >
      <div className="flex-1 min-w-0">
        <span className="text-[#f1f5f9] text-base font-semibold truncate block">{session.title}</span>
      </div>
      <span className="text-[#94a3b8] text-[13px] whitespace-nowrap">{dateDisplay}</span>
      <span className="text-[#94a3b8] text-[13px] whitespace-nowrap">{durationDisplay}</span>
      <span
        className="text-[13px] font-semibold rounded px-2 py-1 tabular-nums"
        style={scoreBadgeStyle(session.scorecard)}
      >
        {scoreDisplay}
      </span>
      <button
        type="button"
        aria-label="Delete session"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-[#475569] hover:text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] motion-safe:transition-colors motion-safe:duration-150 text-[13px] leading-none px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef4444] focus-visible:outline-offset-1"
      >
        ×
      </button>
    </div>
  );
}
