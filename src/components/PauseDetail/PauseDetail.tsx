import { useEffect, useState } from 'react';
import { computePauseStats } from '../../analysis/pacing';
import type { SessionEvent } from '../../db/db';
import type { TranscriptSegment } from '../../hooks/useSpeechCapture';

interface PauseDetailProps {
  events: SessionEvent[];
  transcript?: TranscriptSegment[];
}

function AnimatedCount({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) {
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
  const formatted = decimals > 0 ? display.toFixed(decimals) : String(Math.round(display));
  return <>{formatted}{suffix}</>;
}

export default function PauseDetail({ events, transcript }: PauseDetailProps) {
  const stats = computePauseStats(events, transcript ?? []);
  const hasTranscript = (transcript ?? []).length > 0;

  return (
    <div>
      <p className="section-label">Pauses</p>
      {stats.total === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>None detected</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { val: stats.total, label: 'Total', decimals: 0 },
              { val: stats.averageDurationS, label: 'Avg', decimals: 1, suffix: 's' },
              { val: stats.longestDurationS, label: 'Longest', decimals: 1, suffix: 's' },
            ].map(({ val, label, decimals, suffix }) => (
              <div key={label}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                  <AnimatedCount value={val} decimals={decimals} suffix={suffix} />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>{label}</div>
              </div>
            ))}
          </div>

          {hasTranscript && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {([
                { val: stats.hesitationCount, label: 'Hesitation', color: '#f59e0b' },
                { val: stats.deliberateCount, label: 'Deliberate', color: '#10b981' },
              ] as const).map(({ val, label, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    <AnimatedCount value={val} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
