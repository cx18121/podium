// src/components/ScorecardView/ScorecardView.tsx
import { useEffect, useState } from 'react';
import type { ScorecardResult } from '../../analysis/scorer';

function scoreBarColor(score: number): string {
  if (score >= 70) return '#00d4a8';
  if (score >= 40) return '#f59e0b';
  return '#f43f5e';
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
];

const RADIUS = 66;
const CIRC = 2 * Math.PI * RADIUS; // ≈ 414.7

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimated(true));
  }, []);

  if (scorecard === null) {
    return (
      <div
        aria-busy="true"
        style={{
          background: '#0b1022',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '18px',
          padding: '24px',
          width: '100%',
          maxWidth: '672px',
          color: '#5e6f94',
          fontFamily: 'Figtree, system-ui, sans-serif',
        }}
      >
        Calculating scores...
      </div>
    );
  }

  const score = scorecard.overall;
  const ringStroke = scoreRingColor(score);

  return (
    <div style={{
      background: '#0b1022',
      border: '1px solid rgba(255,255,255,0.05)',
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
      <h2 style={{
        fontSize: '11px',
        fontFamily: 'Figtree, system-ui, sans-serif',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: '#363e55',
        margin: 0,
      }}>
        Session Scorecard
      </h2>

      {/* Overall score ring + label */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ position: 'relative', width: '156px', height: '156px' }}>
          <svg width="156" height="156" viewBox="0 0 156 156" aria-hidden="true">
            <defs>
              {/* Good: teal gradient */}
              <linearGradient id="ring-grad-good" gradientUnits="userSpaceOnUse" x1="156" y1="0" x2="0" y2="156">
                <stop offset="0%" stopColor="#5b8fff" />
                <stop offset="100%" stopColor="#00d4a8" />
              </linearGradient>
              {/* Warn: amber gradient */}
              <linearGradient id="ring-grad-warn" gradientUnits="userSpaceOnUse" x1="156" y1="0" x2="0" y2="156">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fbbf24" />
              </linearGradient>
              {/* Bad: red gradient */}
              <linearGradient id="ring-grad-bad" gradientUnits="userSpaceOnUse" x1="156" y1="0" x2="0" y2="156">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" />
              </linearGradient>
            </defs>
            {/* Track ring */}
            <circle cx="78" cy="78" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
            {/* Score arc */}
            <circle
              cx="78" cy="78" r={RADIUS}
              fill="none"
              stroke={ringStroke}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC - (score / 100) * CIRC}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '78px 78px',
                filter: score >= 70
                  ? 'drop-shadow(0 0 14px rgba(0,212,168,0.40))'
                  : score >= 40
                  ? 'drop-shadow(0 0 14px rgba(245,158,11,0.35))'
                  : 'drop-shadow(0 0 14px rgba(244,63,94,0.35))',
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
              fontSize: '3rem',
              letterSpacing: '-0.04em',
              color: '#e4e9f5',
              lineHeight: 1,
            }}
          >
            {score}
          </output>
        </div>

        <span style={{
          fontSize: '12px',
          fontFamily: 'Figtree',
          fontWeight: 500,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: '#363e55',
        }}>
          Overall Score
        </span>
      </div>

      {/* Dimension bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {DIMENSIONS.map(({ key, label }) => {
          const dim = scorecard.dimensions[key];
          const barColor = scoreBarColor(dim.score);
          return (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{
                  fontSize: '13px',
                  fontFamily: 'Figtree',
                  fontWeight: 500,
                  color: '#7a8fb8',
                  letterSpacing: '0.01em',
                }}>
                  {label}
                </span>
                <span style={{
                  fontSize: '12px',
                  fontFamily: 'Figtree',
                  color: '#5e6f94',
                }}>
                  {dim.detail ?? 'Insufficient data'}
                </span>
              </div>
              {/* Bar track */}
              <div style={{
                width: '100%',
                height: '5px',
                background: 'rgba(255,255,255,0.04)',
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
