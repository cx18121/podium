import type { Session } from '../../db/db';

interface SessionListItemProps {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}

function scoreBadgeClass(scorecard: Session['scorecard']): string {
  if (scorecard === null) return 'bg-gray-700 text-gray-400';
  const s = scorecard.overall;
  if (s >= 70) return 'bg-emerald-900 text-emerald-300';
  if (s >= 40) return 'bg-amber-900 text-amber-300';
  return 'bg-red-900 text-red-300';
}

export function SessionListItem({ session, onOpen, onDelete }: SessionListItemProps) {
  const dateDisplay = new Date(session.createdAt).toLocaleDateString();
  const sec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const scoreDisplay = session.scorecard === null ? '—' : session.scorecard.overall;

  return (
    <div
      onClick={onOpen}
      className="bg-gray-900 rounded-2xl px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-semibold truncate block">{session.title}</span>
      </div>
      <span className="text-gray-400 text-sm whitespace-nowrap">{dateDisplay}</span>
      <span className="text-gray-400 text-sm whitespace-nowrap">{durationDisplay}</span>
      <span className={`text-sm font-bold rounded-lg px-2 py-1 ${scoreBadgeClass(session.scorecard)}`}>
        {scoreDisplay}
      </span>
      <button
        type="button"
        aria-label="Delete session"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="text-gray-600 hover:text-red-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-colors text-lg leading-none px-2"
      >
        ×
      </button>
    </div>
  );
}
