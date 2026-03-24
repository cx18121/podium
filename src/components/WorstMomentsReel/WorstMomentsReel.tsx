import type { WorstMomentsResult } from '../../analysis/worstMoments';

interface WorstMomentsReelProps {
  moments: WorstMomentsResult;
  onSeek: (timestampMs: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  eye_contact: '#6366f1',
  filler_cluster: '#fbbf24',
  body_sway: '#ef4444',
};

const CATEGORY_LABELS: Record<string, string> = {
  eye_contact: 'Eye Contact',
  filler_cluster: 'Fillers',
  body_sway: 'Sway',
};

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `at ${min}:${String(sec).padStart(2, '0')}`;
}

function JumpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="btn-jump focus-ring"
    >
      Jump to
      <span aria-hidden="true" className="btn-jump-arrow">→</span>
    </button>
  );
}

export default function WorstMomentsReel({ moments, onSeek }: WorstMomentsReelProps) {
  const activeMoments = [
    moments.longestEyeContactBreak,
    moments.densestFillerCluster,
    moments.biggestSway,
  ].filter(Boolean) as NonNullable<typeof moments.longestEyeContactBreak>[];

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '18px',
      padding: '24px',
      width: '100%',
      fontFamily: 'Figtree, system-ui, sans-serif',
    }}>
      <h3 style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        margin: '0 0 16px 0',
      }}>
        Moments to Review
      </h3>
      {activeMoments.length === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          No significant issues detected
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeMoments.map((moment, index) => (
            <div
              key={`${moment.category}-${moment.timestampMs}`}
              className="flex items-center gap-3"
              style={{ animation: 'fade-up 0.35s ease-out both', animationDelay: `${index * 0.08}s` }}
            >
              <div style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                backgroundColor: `${CATEGORY_COLORS[moment.category]}18`,
                color: CATEGORY_COLORS[moment.category],
                border: `1px solid ${CATEGORY_COLORS[moment.category]}30`,
                flexShrink: 0,
                whiteSpace: 'nowrap' as const,
                fontFamily: 'Figtree, system-ui, sans-serif',
              }}>
                {CATEGORY_LABELS[moment.category] ?? moment.category}
              </div>
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                <span style={{
                  fontSize: index === 0 ? '15px' : '14px',
                  fontWeight: index === 0 ? 700 : 600,
                  color: 'var(--color-text-primary)',
                  flex: 1,
                }}>
                  {moment.label}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                  {formatTimestamp(moment.timestampMs)}
                </span>
              </div>
              <JumpButton onClick={() => onSeek(moment.timestampMs)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
