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
  scores: number[];
  label: string;
  trend?: TrendDirection;
}

export function SparklineChart({ scores, label, trend }: SparklineChartProps) {
  const W = 200;
  const H = 32;
  const pad = 4;

  const trendLabel = trend === 'improving'
    ? { text: '↑ improving', color: '#00d4a8' }
    : trend === 'declining'
    ? { text: '↓ declining', color: '#f43f5e' }
    : trend === 'stable'
    ? { text: '→ stable', color: '#5e6f94' }
    : null;

  if (scores.length < 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#363e55', fontFamily: 'Figtree' }}>Need more sessions</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: '#5e6f94', fontFamily: 'Figtree' }}>{label}</span>
          {trendLabel && (
            <span style={{ fontSize: '11px', color: trendLabel.color, fontFamily: 'Figtree' }}>
              {trendLabel.text}
            </span>
          )}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height: '32px', width: '100%' }} aria-hidden="true">
        <defs>
          <linearGradient id={`spark-fill-${label.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b8fff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#5b8fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={d} stroke="#5b8fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2" fill="#5b8fff" />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '11px', color: '#5e6f94', fontFamily: 'Figtree', fontWeight: 500 }}>{label}</span>
        {trendLabel && (
          <span style={{ fontSize: '11px', color: trendLabel.color, fontFamily: 'Figtree' }}>
            {trendLabel.text}
          </span>
        )}
      </div>
    </div>
  );
}
