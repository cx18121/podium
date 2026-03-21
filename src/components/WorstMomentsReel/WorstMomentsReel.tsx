import { useState } from 'react';
import type { WorstMomentsResult } from '../../analysis/worstMoments';

interface WorstMomentsReelProps {
  moments: WorstMomentsResult;
  onSeek: (timestampMs: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  eye_contact: '#5b8fff',
  filler_cluster: '#f59e0b',
  body_sway: '#f43f5e',
};

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `at ${min}:${String(sec).padStart(2, '0')}`;
}

function JumpButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        minHeight: '44px',
        padding: '8px 16px',
        background: hovered ? 'rgba(91,143,255,0.22)' : 'rgba(91,143,255,0.12)',
        color: '#5b8fff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Figtree, system-ui, sans-serif',
        transition: 'background 0.15s ease',
      }}
      className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-2"
    >
      Jump to
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
      background: '#0b1022',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '24px',
      width: '100%',
      fontFamily: 'Figtree, system-ui, sans-serif',
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#8a9bc2',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: '0 0 16px 0',
      }}>
        WORST MOMENTS
      </h3>
      {activeMoments.length === 0 ? (
        <p style={{ fontSize: '14px', color: '#5e6f94', margin: 0 }}>
          No significant issues detected
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeMoments.map((moment) => (
            <div
              key={`${moment.category}-${moment.timestampMs}`}
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: CATEGORY_COLORS[moment.category],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#e4e9f5' }}>
                {moment.label}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 400, color: '#5e6f94', flex: 1 }}>
                {formatTimestamp(moment.timestampMs)}
              </span>
              <JumpButton onClick={() => onSeek(moment.timestampMs)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
