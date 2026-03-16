// src/components/ScorecardView/ScorecardView.tsx
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

export default function ScorecardView({ scorecard }: ScorecardViewProps) {
  if (scorecard === null) {
    return (
      <div aria-busy="true" className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl text-gray-400">
        Calculating scores...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl flex flex-col gap-4">
      {/* Heading */}
      <h2 className="text-sm text-gray-400">Your Session Scorecard</h2>

      {/* Overall score — Display size (text-3xl), bold */}
      <div className="flex flex-col items-center gap-1">
        <output aria-label="Overall score" className="text-3xl font-bold text-white">
          {scorecard.overall}
        </output>
        <span className="text-sm text-gray-400">Overall Score</span>
      </div>

      {/* Five dimension rows */}
      {DIMENSIONS.map(({ key, label }) => {
        const dim = scorecard.dimensions[key];
        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-white">{label}</span>
              <span className="text-sm text-gray-400">{dim.detail ?? 'Insufficient data'}</span>
            </div>
            {/* Score bar: bg-gray-700 track, bg-red-600 fill */}
            <div className="w-full h-2 bg-gray-700 rounded-full">
              <div
                role="meter"
                aria-label={`${label} score`}
                aria-valuenow={dim.score}
                aria-valuemin={0}
                aria-valuemax={100}
                className={`h-2 rounded-full ${scoreBarColor(dim.score)}`}
                style={{ width: `${dim.score}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
