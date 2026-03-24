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
    const duration = 750;
    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * value);
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
        textTransform: 'uppercase' as const,
        letterSpacing: '0.12em',
        margin: '0 0 16px 0',
      }}>
        Pause Analysis
      </h3>

      {stats.total === 0 ? (
        <p style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          margin: 0,
        }}>
          No significant pauses detected
        </p>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: hasTranscript ? '20px' : 0,
          }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCount value={stats.total} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Total Pauses
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCount value={stats.averageDurationS} decimals={1} suffix="s" />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Avg Duration
              </div>
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                <AnimatedCount value={stats.longestDurationS} decimals={1} suffix="s" />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Longest
              </div>
            </div>
          </div>

          {hasTranscript && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}>
              <div style={{
                background: 'rgba(251,191,36,0.06)',
                border: '1px solid rgba(251,191,36,0.14)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-warning)' }}>
                  <AnimatedCount value={stats.hesitationCount} />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(251,191,36,0.6)' }}>
                  Hesitation
                </div>
              </div>
              <div style={{
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.14)',
                borderRadius: '12px',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: '28px', fontWeight: 600, color: 'var(--color-success)' }}>
                  <AnimatedCount value={stats.deliberateCount} />
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(16,185,129,0.6)' }}>
                  Deliberate
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
