import { useEffect, useState } from 'react';
import type { ScorecardResult } from '../../analysis/scorer';

function scoreColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function scoreBarColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function coachLine(score: number): string {
  if (score >= 70) return 'Strong session.';
  if (score >= 40) return 'Good progress.';
  return 'Keep at it.';
}

interface ScorecardViewProps {
  scorecard: ScorecardResult | null;
}

const DIMENSIONS: { key: keyof ScorecardResult['dimensions']; label: string }[] = [
  { key: 'eyeContact', label: 'Eye Contact' },
  { key: 'fillers', label: 'Filler Words' },
  { key: 'pacing', label: 'Pacing' },
  { key: 'expressiveness', label: 'Expressiveness' },
  { key: 'gestures', label: 'Nervous Gestures' },
  { key: 'openingClosing', label: 'Opening / Closing' },
];

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  const [animated, setAnimated] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreRevealed, setScoreRevealed] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimated(true));
  }, []);

  useEffect(() => {
    if (!animated || scorecard === null) return;
    const target = Math.min(100, Math.max(0, isNaN(scorecard.overall) ? 0 : scorecard.overall));
    const duration = 900;
    const startTime = performance.now();
    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * target));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (target >= 70) {
        setTimeout(() => setScoreRevealed(true), 60);
      }
    }
    requestAnimationFrame(tick);
  }, [animated, scorecard]);

  if (scorecard === null) {
    return (
      <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '4px 0' }}>
        Calculating scores...
      </div>
    );
  }

  const overall = Math.min(100, Math.max(0, isNaN(scorecard.overall) ? 0 : scorecard.overall));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overall score */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
          <output
            aria-label="Overall score"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              fontSize: '3.5rem',
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: scoreColor(overall),
              fontVariantNumeric: 'tabular-nums',
              animation: scoreRevealed ? 'score-pop 0.35s ease-out both' : undefined,
            }}
          >
            {displayScore}
          </output>
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}>
            Overall
          </span>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          {coachLine(overall)}
        </span>
      </div>

      {/* Dimension bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {DIMENSIONS.map(({ key, label }, i) => {
          const dim = scorecard.dimensions[key];
          const barColor = scoreBarColor(dim.score);
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                  {label}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {dim.detail ?? '—'}
                </span>
              </div>
              <div style={{
                height: '3px',
                background: 'rgba(255,255,255,0.07)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}>
                <div
                  role="meter"
                  aria-label={`${label} score`}
                  aria-valuenow={dim.score}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{
                    height: '100%',
                    borderRadius: '9999px',
                    background: barColor,
                    width: animated ? `${dim.score}%` : '0%',
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                    transitionDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
