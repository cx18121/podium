import type { WorstMomentsResult } from '../../analysis/worstMoments';

interface WorstMomentsReelProps {
  moments: WorstMomentsResult;
  onSeek: (timestampMs: number) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  eye_contact: 'Eye contact',
  filler_cluster: 'Fillers',
  body_sway: 'Sway',
};

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export default function WorstMomentsReel({ moments, onSeek }: WorstMomentsReelProps) {
  const activeMoments = [
    moments.longestEyeContactBreak,
    moments.densestFillerCluster,
    moments.biggestSway,
  ].filter(Boolean) as NonNullable<typeof moments.longestEyeContactBreak>[];

  if (activeMoments.length === 0) return null;

  return (
    <div>
      <p className="section-label">Moments to Fix</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {activeMoments.map((moment) => (
          <div
            key={`${moment.category}-${moment.timestampMs}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 12px',
              background: 'var(--color-surface-raised)',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.09em', textTransform: 'uppercase' }}>
                {CATEGORY_LABELS[moment.category] ?? moment.category}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {moment.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {formatTimestamp(moment.timestampMs)}
              </span>
              <button
                onClick={() => onSeek(moment.timestampMs)}
                className="btn-jump focus-ring"
              >
                Jump <span aria-hidden="true" className="btn-jump-arrow">→</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
