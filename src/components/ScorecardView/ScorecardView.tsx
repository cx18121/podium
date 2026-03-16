// src/components/ScorecardView/ScorecardView.tsx
import { useEffect, useState } from 'react';
import type { ScorecardResult } from '../../analysis/scorer';

function scoreBarColor(score: number): string {
  if (score >= 70) return 'bg-emerald-500';
  if (score >= 40) return 'bg-amber-400';
  return 'bg-red-500';
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

const RADIUS = 54;
const CIRC = 2 * Math.PI * RADIUS; // ≈ 339.3

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimated(true));
  }, []);

  if (scorecard === null) {
    return (
      <div aria-busy="true" className="bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 w-full max-w-2xl text-[#94a3b8]">
        Calculating scores...
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 w-full max-w-2xl flex flex-col gap-6">
      {/* Heading */}
      <h2 className="text-sm text-[#94a3b8] tracking-wide">Your Session Scorecard</h2>

      {/* Overall score — SVG ring */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-[120px] h-[120px]">
          <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
            {/* Track ring */}
            <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#1a2235" strokeWidth="6" />
            {/* Score arc — indigo, starts at 12 o'clock via rotate(-90deg) */}
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="#6366f1"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC - (scorecard.overall / 100) * CIRC}
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '60px 60px',
                filter: 'drop-shadow(0 0 8px rgba(99,102,241,0.4))',
              }}
            />
          </svg>
          <output
            aria-label="Overall score"
            className="absolute inset-0 flex items-center justify-center text-5xl font-semibold tabular-nums text-[#f1f5f9]"
          >
            {scorecard.overall}
          </output>
        </div>
        <span className="text-sm text-[#94a3b8]">Overall Score</span>
      </div>

      {/* Five dimension rows */}
      {DIMENSIONS.map(({ key, label }) => {
        const dim = scorecard.dimensions[key];
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] text-[#94a3b8] tracking-wide">{label}</span>
              <span className="text-[13px] text-[#94a3b8]">{dim.detail ?? 'Insufficient data'}</span>
            </div>
            {/* Bar track: 4px, #1a2235 bg */}
            <div className="w-full h-1 bg-[#1a2235] rounded-full">
              <div
                role="meter"
                aria-label={`${label} score`}
                aria-valuenow={dim.score}
                aria-valuemin={0}
                aria-valuemax={100}
                className={`h-1 rounded-full motion-safe:transition-all motion-safe:duration-300 ${scoreBarColor(dim.score)}`}
                style={{ width: animated ? `${dim.score}%` : '0%' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
