import { useEffect, useState } from 'react';
import type { ScorecardResult } from '../../analysis/scorer';
import { scoreColor } from '../../analysis/scoreColor';

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

const TIPS: Record<string, { threshold: number; tip: string }[]> = {
  eyeContact: [
    { threshold: 50, tip: 'Pick 2–3 fixed points in the room to return to — anchor your gaze rather than letting it drift.' },
    { threshold: 75, tip: 'Pause before looking down at notes so breaks feel intentional, not nervous.' },
  ],
  fillers: [
    { threshold: 50, tip: 'Replace fillers with silence. A deliberate pause sounds more confident than "um".' },
    { threshold: 75, tip: 'Notice your trigger moments — transitions between ideas tend to produce the most fillers.' },
  ],
  pacing: [
    { threshold: 50, tip: 'Mark pause points in your script and slow down at section transitions.' },
    { threshold: 75, tip: 'Vary your speed intentionally — slow for key points, faster for supporting context.' },
  ],
  expressiveness: [
    { threshold: 50, tip: 'Animate your face when making a strong point. Start with deliberate eyebrow raises and smiles.' },
    { threshold: 75, tip: 'Let your expression lead your words, not lag behind them.' },
  ],
  gestures: [
    { threshold: 50, tip: 'Rest your hands at your sides or on a surface when not gesturing purposefully.' },
    { threshold: 75, tip: 'Watch for nervous gestures during transitions — that\'s when they tend to spike.' },
  ],
  openingClosing: [
    { threshold: 50, tip: 'Script your first and last 30 seconds. Strong bookends anchor the whole talk.' },
    { threshold: 75, tip: 'Cut filler words and eye breaks from your opening — that\'s when first impressions form.' },
  ],
};

function getTip(key: string, score: number): string | null {
  const tiers = TIPS[key];
  if (!tiers) return null;
  for (const { threshold, tip } of tiers) {
    if (score < threshold) return tip;
  }
  return null;
}

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
      } else {
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
        {overall < 70 && scoreRevealed && (() => {
          const focus = DIMENSIONS.reduce((lowest, dim) =>
            scorecard.dimensions[dim.key].score < scorecard.dimensions[lowest.key].score ? dim : lowest
          );
          return (
            <span style={{
              fontSize: '12px',
              color: '#f59e0b',
              fontWeight: 500,
              animation: 'fade-up 0.3s ease-out both',
            }}>
              Focus: {focus.label}
            </span>
          );
        })()}
      </div>

      {/* Dimension bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {DIMENSIONS.map(({ key, label }, i) => {
          const dim = scorecard.dimensions[key];
          const barColor = scoreColor(dim.score);
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
              {(() => {
                const tip = getTip(key, dim.score);
                return tip ? (
                  <p style={{
                    fontSize: '11px',
                    color: 'var(--color-text-muted)',
                    margin: '3px 0 0',
                    lineHeight: 1.55,
                  }}>
                    {tip}
                  </p>
                ) : null;
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
