import type { Session } from '../../db/db';

interface SessionListItemProps {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}

function scoreColor(scorecard: Session['scorecard']): string {
  if (scorecard === null) return 'var(--color-text-muted)';
  const s = scorecard.overall;
  if (s >= 70) return '#10b981';
  if (s >= 40) return '#f59e0b';
  return '#ef4444';
}

export function SessionListItem({ session, onOpen, onDelete }: SessionListItemProps) {
  const dateDisplay = new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const sec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(sec / 60)}m ${sec % 60}s`;
  const scoreDisplay = session.scorecard === null ? '—' : session.scorecard.overall;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-hover)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
      }}
    >
      {/* Title */}
      <span style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        paddingRight: '20px',
      }}>
        {session.title}
      </span>

      {/* Score */}
      <span style={{
        fontSize: '2.25rem',
        fontWeight: 700,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: scoreColor(session.scorecard),
        fontVariantNumeric: 'tabular-nums',
      }}>
        {scoreDisplay}
      </span>

      {/* Metadata */}
      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
        {dateDisplay} · {durationDisplay}
      </span>

      {/* Delete */}
      <button
        type="button"
        aria-label="Delete session"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="btn-icon-muted focus-ring-destructive"
        style={{
          position: 'absolute',
          top: '12px', right: '12px',
          fontFamily: 'system-ui',
        }}
      >
        ×
      </button>
    </div>
  );
}
