// src/components/WPMChart/WPMChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { computeWPMChartData } from '../../analysis/wpmChart';
import type { WPMWindow } from '../../db/db';

interface WPMChartProps {
  wpmWindows?: WPMWindow[];
}

export default function WPMChart({ wpmWindows }: WPMChartProps) {
  const chartData = computeWPMChartData(wpmWindows ?? []);

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
        Speaking Pace
      </h3>
      {(!wpmWindows || chartData.length === 0) ? (
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0 }}>
          No data available
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'Figtree' }}
              axisLine={{ stroke: 'var(--color-border-modal)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontFamily: 'Figtree' }}
              tickLine={false}
              unit=" wpm"
              axisLine={{ stroke: 'var(--color-border-modal)' }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border-hover)',
                borderRadius: '10px',
                fontFamily: 'Figtree',
                fontSize: '13px',
                color: 'var(--color-text-primary)',
              }}
              formatter={(value) => [`${value} wpm`, 'Pace']}
            />
            <ReferenceArea
              y1={120}
              y2={160}
              fill="#10b981"
              fillOpacity={0.06}
              stroke="#10b981"
              strokeOpacity={0.18}
              strokeDasharray="4 4"
              label={{ value: 'ideal', position: 'insideTopRight', fill: 'rgba(16,185,129,0.5)', fontSize: 10, fontFamily: 'Figtree' }}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
