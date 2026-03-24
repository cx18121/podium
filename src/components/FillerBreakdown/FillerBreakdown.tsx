import { useEffect, useState } from 'react';

const PEAK_LABELS: Record<string, string> = {
  first: 'opening third',
  second: 'middle third',
  third: 'final third',
};
import { computeFillerBreakdown } from '../../analysis/fillerBreakdown';
import type { SessionEvent, WhisperFillerResult } from '../../db/db';

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
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * value);
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
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '18px',
      padding: '24px',
      width: '100%',
      fontFamily: 'Figtree, system-ui, sans-serif',
    }}>
      <h3 style={{
        fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)',
        textTransform: 'uppercase' as const, letterSpacing: '0.12em',
        margin: '0 0 16px 0',
      }}>
        Filler Words
      </h3>
      {total === 0 ? (
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          No filler words detected
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {sortedEntries.map(([label, count]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '15px', color: 'var(--color-warning)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  <AnimatedCount value={count} />
                </span>
              </div>
            ))}
          </div>
          {breakdown.peakThird && (
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Heaviest in the{' '}
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
                {PEAK_LABELS[breakdown.peakThird] ?? breakdown.peakThird}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
