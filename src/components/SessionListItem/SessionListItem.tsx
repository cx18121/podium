import type { CSSProperties } from 'react';
import type { Session } from '../../db/db';

interface SessionListItemProps {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}

function scoreBadgeStyle(scorecard: Session['scorecard']): CSSProperties {
  if (scorecard === null) return { backgroundColor: 'rgba(148,163,184,0.12)', color: 'var(--color-text-secondary)' };
  const s = scorecard.overall;
  if (s >= 70) return { backgroundColor: 'rgba(16,185,129,0.12)', color: 'var(--color-success)' };
  if (s >= 40) return { backgroundColor: 'rgba(251,191,36,0.12)', color: 'var(--color-warning)' };
  return { backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--color-destructive)' };
}

function scoreAccentColor(scorecard: Session['scorecard']): string {
  if (scorecard === null) return 'rgba(255,255,255,0.06)';
  const s = scorecard.overall;
  if (s >= 70) return 'rgba(16,185,129,0.18)';
  if (s >= 40) return 'rgba(251,191,36,0.18)';
  return 'rgba(239,68,68,0.18)';
}

export function SessionListItem({ session, onOpen, onDelete }: SessionListItemProps) {
  const dateDisplay = new Date(session.createdAt).toLocaleDateString();
  const sec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const scoreDisplay = session.scorecard === null ? '—' : session.scorecard.overall;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="items-start sm:items-center"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${scoreAccentColor(session.scorecard)}`,
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface-raised)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(99,102,241,0.15)';
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = scoreAccentColor(session.scorecard);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = 'var(--color-surface)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)';
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = scoreAccentColor(session.scorecard);
      }}
    >
      {/* Title + metadata — two rows on mobile, single row on sm+ */}
      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <span style={{
          display: 'block',
          color: 'var(--color-text-primary)',
          fontSize: '14px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: '1 1 0',
          minWidth: 0,
        }}>
          {session.title}
        </span>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {dateDisplay}
          </span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {durationDisplay}
          </span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            borderRadius: '8px',
            padding: '3px 10px',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Syne, system-ui, sans-serif',
            ...scoreBadgeStyle(session.scorecard),
          }}>
            {scoreDisplay}
          </span>
        </div>
      </div>

      <button
        type="button"
        aria-label="Delete session"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="btn-icon-muted focus-ring-destructive"
        style={{ fontFamily: 'system-ui' }}
      >
        ×
      </button>
    </div>
  );
}
