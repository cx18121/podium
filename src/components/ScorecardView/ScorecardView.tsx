// src/components/ScorecardView/ScorecardView.tsx
import { useEffect, useState } from 'react';
import type { ScorecardResult } from '../../analysis/scorer';

function scoreBarColor(score: number): string {
  if (score >= 70) return '#10b981';
  if (score >= 40) return '#fbbf24';
  return '#ef4444';
}

function scoreRingColor(score: number): string {
  if (score >= 70) return 'url(#ring-grad-good)';
  if (score >= 40) return 'url(#ring-grad-warn)';
  return 'url(#ring-grad-bad)';
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

const RADIUS = 88;
const CIRC = 2 * Math.PI * RADIUS;

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  const [animated, setAnimated] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [scoreRevealed, setScoreRevealed] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimated(true));
  }, []);

  // Count-up the center number in sync with the arc draw (1 000 ms)
  useEffect(() => {
    if (!animated || scorecard === null) return;
    const target = Math.min(100, Math.max(0, isNaN(scorecard.overall) ? 0 : scorecard.overall));
    const duration = 1000;
    const startTime = performance.now();

    function tick(now: number) {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplayScore(Math.round(eased * target));
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (target >= 70) {
        // Brief pop only on good scores — signals success without fanfare
        setTimeout(() => setScoreRevealed(true), 60);
      }
    }

    requestAnimationFrame(tick);
  }, [animated, scorecard]);

  if (scorecard === null) {
    return (
      <div
        aria-busy="true"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '18px',
          padding: '24px',
          width: '100%',
          maxWidth: '672px',
          color: 'var(--color-text-secondary)',
        }}
      >
        Calculating scores...
      </div>
    );
  }

  const score = Math.min(100, Math.max(0, isNaN(scorecard.overall) ? 0 : scorecard.overall));
  const ringStroke = scoreRingColor(score);

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '18px',
      padding: '28px',
      width: '100%',
      maxWidth: '672px',
      display: 'flex',
      flexDirection: 'column',
      gap: '28px',
      animation: 'scale-in 0.4s ease-out both',
    }}>

      {/* Header */}
      <h2 className="text-caps" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
        Session Scorecard
      </h2>

      {/* Overall score ring + label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              {/* Good: emerald */}
              <linearGradient id="ring-grad-good" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="0" y2="200">
                <stop offset="0%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              {/* Warn: amber */}
              <linearGradient id="ring-grad-warn" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="0" y2="200">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              {/* Bad: red */}
              <linearGradient id="ring-grad-bad" gradientUnits="userSpaceOnUse" x1="200" y1="0" x2="0" y2="200">
                <stop offset="0%" stopColor="#f87171" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>
            {/* Track ring */}
            <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="11" />
            {/* Score arc — starts fully undrawn, transitions to target */}
            <circle
              cx="100" cy="100" r={RADIUS}
              fill="none"
              stroke={ringStroke}
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={animated ? CIRC - (score / 100) * CIRC : CIRC}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '100px 100px',
                filter: score >= 70
                  ? 'drop-shadow(0 0 12px rgba(16,185,129,0.35))'
                  : score >= 40
                  ? 'drop-shadow(0 0 12px rgba(251,191,36,0.30))'
                  : 'drop-shadow(0 0 12px rgba(239,68,68,0.30))',
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </svg>

          <output
            aria-label="Overall score"
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, system-ui, sans-serif',
              fontWeight: 800,
              fontSize: '3.75rem',
              letterSpacing: '-0.04em',
              color: 'var(--color-text-primary)',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              animation: scoreRevealed ? 'score-pop 0.4s cubic-bezier(0.34,1.56,0.64,1) both' : undefined,
            }}
          >
            {displayScore}
          </output>
        </div>

        <span style={{
          fontSize: '12px',
          fontWeight: 500,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}>
          Overall Score
        </span>
      </div>

      {/* Dimension bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {DIMENSIONS.map(({ key, label }, i) => {
          const dim = scorecard.dimensions[key];
          const barColor = scoreBarColor(dim.score);
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </span>
                <span style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                }}>
                  {dim.detail ?? 'Not enough data'}
                </span>
              </div>
              {/* Bar track */}
              <div style={{
                width: '100%',
                height: '9px',
                background: 'rgba(255,255,255,0.05)',
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
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    transitionDelay: `${i * 80}ms`,
                    boxShadow: `0 0 8px ${barColor}66`,
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
