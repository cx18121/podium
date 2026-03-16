import type { CSSProperties } from 'react';
import type { Session } from '../../db/db';

interface SessionListItemProps {
  session: Session;
  onOpen: () => void;
  onDelete: () => void;
}

function scoreBadgeStyle(scorecard: Session['scorecard']): CSSProperties {
  if (scorecard === null) return { backgroundColor: 'rgba(148,163,184,0.15)', color: 'rgb(148,163,184)' };
  const s = scorecard.overall;
  if (s >= 70) return { backgroundColor: 'rgba(16,185,129,0.15)', color: 'rgb(16,185,129)' };
  if (s >= 40) return { backgroundColor: 'rgba(251,191,36,0.15)', color: 'rgb(251,191,36)' };
  return { backgroundColor: 'rgba(239,68,68,0.15)', color: 'rgb(239,68,68)' };
}

function scoreAccentColor(scorecard: Session['scorecard']): string {
  if (scorecard === null) return 'rgba(255,255,255,0.05)';
  const s = scorecard.overall;
  if (s >= 70) return 'rgba(0,212,168,0.18)';
  if (s >= 40) return 'rgba(245,158,11,0.18)';
  return 'rgba(244,63,94,0.18)';
}

export function SessionListItem({ session, onOpen, onDelete }: SessionListItemProps) {
  const dateDisplay = new Date(session.createdAt).toLocaleDateString();
  const sec = Math.round(session.durationMs / 1000);
  const durationDisplay = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const scoreDisplay = session.scorecard === null ? '—' : session.scorecard.overall;

  return (
    <div
      onClick={onOpen}
      style={{
        background: '#0b1022',
        border: '1px solid rgba(255,255,255,0.05)',
        borderLeft: `3px solid ${scoreAccentColor(session.scorecard)}`,
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#101828';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(91,143,255,0.15)';
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = scoreAccentColor(session.scorecard);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.background = '#0b1022';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.05)';
        (e.currentTarget as HTMLDivElement).style.borderLeftColor = scoreAccentColor(session.scorecard);
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{
          display: 'block',
          color: '#e4e9f5',
          fontSize: '14px',
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {session.title}
        </span>
      </div>

      <span style={{ color: '#5e6f94', fontSize: '12.5px', whiteSpace: 'nowrap', fontFamily: 'Figtree' }}>
        {dateDisplay}
      </span>
      <span style={{ color: '#5e6f94', fontSize: '12.5px', whiteSpace: 'nowrap', fontFamily: 'Figtree' }}>
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

      <button
        type="button"
        aria-label="Delete session"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={{
          color: '#363e55',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: '4px 8px',
          borderRadius: '6px',
          transition: 'all 0.15s ease',
          fontFamily: 'system-ui',
        }}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f43f5e] focus-visible:outline-offset-1"
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#f43f5e';
          e.currentTarget.style.background = 'rgba(244,63,94,0.10)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#363e55';
          e.currentTarget.style.background = 'none';
        }}
      >
        ×
      </button>
    </div>
  );
}
