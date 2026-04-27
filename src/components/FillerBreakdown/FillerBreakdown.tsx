import { useEffect, useState } from 'react';
import { computeFillerBreakdown } from '../../analysis/fillerBreakdown';
import type { SessionEvent, WhisperFillerResult } from '../../db/db';

const PEAK_LABELS: Record<string, string> = {
  first: 'opening third',
  second: 'middle third',
  third: 'final third',
};

interface FillerBreakdownProps {
  events: SessionEvent[];
  durationMs: number;
  whisperFillers?: WhisperFillerResult;
}

function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (value === 0) return;
    const duration = 700;
    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      setDisplay((1 - Math.pow(1 - t, 3)) * value);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [value]);
  return <>{Math.round(display)}</>;
}

export default function FillerBreakdown({ events, durationMs, whisperFillers }: FillerBreakdownProps) {
  const breakdown = computeFillerBreakdown(events, durationMs);
  const byType = whisperFillers?.byType ?? breakdown.byType;
  const total = whisperFillers
    ? Object.values(whisperFillers.byType).reduce((s, n) => s + n, 0)
    : breakdown.total;
  const sortedEntries = Object.entries(byType).sort(([, a], [, b]) => b - a);

  return (
    <div>
      <p className="section-label">Fillers</p>
      {total === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>None detected</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedEntries.map(([label, count]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {label}
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCount value={count} />
              </span>
            </div>
          ))}
          {breakdown.peakThird && (
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Heaviest in the{' '}
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {PEAK_LABELS[breakdown.peakThird] ?? breakdown.peakThird}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
