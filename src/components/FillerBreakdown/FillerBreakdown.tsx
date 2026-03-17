import { computeFillerBreakdown } from '../../analysis/fillerBreakdown';
import type { SessionEvent, WhisperFillerResult } from '../../db/db';

interface FillerBreakdownProps {
  events: SessionEvent[];
  durationMs: number;
  whisperFillers?: WhisperFillerResult;
}

export default function FillerBreakdown({ events, durationMs, whisperFillers }: FillerBreakdownProps) {
  const breakdown = computeFillerBreakdown(events, durationMs);
  const byType = whisperFillers?.byType ?? breakdown.byType;
  const total = whisperFillers
    ? Object.values(whisperFillers.byType).reduce((s, n) => s + n, 0)
    : breakdown.total;
  const sortedEntries = Object.entries(byType).sort(([, a], [, b]) => b - a);

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
        fontSize: '14px', fontWeight: 600, color: '#8a9bc2',
        textTransform: 'uppercase' as const, letterSpacing: '0.06em',
        margin: '0 0 16px 0',
      }}>
        Filler Words
      </h3>
      {total === 0 ? (
        <p style={{ fontSize: '14px', color: '#5e6f94', margin: 0 }}>
          No filler words detected
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {sortedEntries.map(([label, count]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', color: '#fbbf24', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '28px', fontWeight: 600, color: '#e4e9f5' }}>{count}</span>
              </div>
            ))}
          </div>
          {breakdown.peakThird && (
            <div style={{ fontSize: '13px', color: '#5e6f94' }}>
              Peak: <span style={{ color: '#e4e9f5', fontWeight: 600 }}>{breakdown.peakThird.charAt(0).toUpperCase() + breakdown.peakThird.slice(1)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
