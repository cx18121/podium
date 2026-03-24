import { useEffect, useState } from 'react';

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

function calcPathLength(pts: { x: number; y: number }[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

export function SparklineChart({ scores, label, trend }: SparklineChartProps) {
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setDrawn(true));
  }, []);

  const W = 200;
  const H = 32;
  const pad = 4;

  const trendColor = trend === 'improving'
    ? '#10b981'
    : trend === 'declining'
    ? '#ef4444'
    : '#6366f1';

  const trendLabel = trend === 'improving'
    ? { text: '↑ improving', color: '#10b981' }
    : trend === 'declining'
    ? { text: '↓ declining', color: '#ef4444' }
    : trend === 'stable'
    ? { text: '→ stable', color: '#94a3b8' }
    : null;

  if (scores.length < 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'Figtree' }}>Need more sessions</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'Figtree' }}>{label}</span>
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
  const gradientId = `spark-fill-${label.replace(/\s/g, '')}`;
  const pathLen = calcPathLength(pts);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ height: '32px', width: '100%' }} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={trendColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={trendColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Line draws in left-to-right */}
        <path
          d={d}
          stroke={trendColor}
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={pathLen}
          strokeDashoffset={drawn ? 0 : pathLen}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Dots fade in sequentially after the line is ~halfway drawn */}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill={trendColor}
            opacity={drawn ? 1 : 0}
            style={{ transition: `opacity 0.25s ease ${0.45 + i * 0.06}s` }}
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontFamily: 'Figtree', fontWeight: 500 }}>{label}</span>
        {trendLabel && (
          <span style={{ fontSize: '11px', color: trendLabel.color, fontFamily: 'Figtree' }}>
            {trendLabel.text}
          </span>
        )}
      </div>
    </div>
  );
}
