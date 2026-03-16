export type TrendDirection = 'improving' | 'stable' | 'declining';

export function computeTrendDirection(scores: number[]): TrendDirection {
  if (scores.length < 4) return 'stable';
  const first3 = scores.slice(0, 3);
  const last3 = scores.slice(-3);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const diff = avg(last3) - avg(first3);
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

interface SparklineChartProps {
  scores: number[];  // 0–100, oldest → newest
  label: string;
  trend?: TrendDirection;  // optional — rendered as label when provided
}

export function SparklineChart({ scores, label, trend }: SparklineChartProps) {
  const W = 200;
  const H = 32;
  const pad = 4;

  const trendLabel = trend === 'improving'
    ? { text: '↑ improving', cls: 'text-green-400' }
    : trend === 'declining'
    ? { text: '↓ declining', cls: 'text-red-400' }
    : trend === 'stable'
    ? { text: '→ stable', cls: 'text-gray-400' }
    : null;

  if (scores.length < 2) {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-8 flex items-center">
          <span className="text-xs text-[#475569]">Need more sessions</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#94a3b8]">{label}</span>
          {trendLabel && <span className={`text-xs ${trendLabel.cls}`}>{trendLabel.text}</span>}
        </div>
      </div>
    );
  }

  const pts = scores.map((s, i) => ({
    x: pad + (i / (scores.length - 1)) * (W - pad * 2),
    y: H - pad - ((s / 100) * (H - pad * 2)),
  }));

  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-full" aria-hidden="true">
        <path d={d} stroke="#6366f1" strokeWidth="1.5" fill="none" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#6366f1" />
        ))}
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-[#94a3b8]">{label}</span>
        {trendLabel && <span className={`text-xs ${trendLabel.cls}`}>{trendLabel.text}</span>}
      </div>
    </div>
  );
}
