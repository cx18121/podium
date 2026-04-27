import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts';
import { computeWPMChartData } from '../../analysis/wpmChart';
import type { WPMWindow } from '../../db/db';

interface WPMChartProps {
  wpmWindows?: WPMWindow[];
}

export default function WPMChart({ wpmWindows }: WPMChartProps) {
  const chartData = computeWPMChartData(wpmWindows ?? []);

  return (
    <div>
      <p className="section-label">Speaking Pace</p>
      {(!wpmWindows || chartData.length === 0) ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'Geist Mono, Courier New, monospace' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-muted)', fontSize: 10, fontFamily: 'Geist Mono, Courier New, monospace' }}
              tickLine={false}
              unit=" wpm"
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface-raised)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontFamily: 'Geist Mono, Courier New, monospace',
                fontSize: '12px',
                color: 'var(--color-text-primary)',
              }}
              formatter={(value) => [`${value} wpm`, 'Pace']}
            />
            <ReferenceArea
              y1={120} y2={160}
              fill="#10b981" fillOpacity={0.04}
              stroke="#10b981" strokeOpacity={0.12}
              strokeDasharray="4 4"
              label={{ value: 'ideal', position: 'insideTopRight', fill: 'rgba(16,185,129,0.4)', fontSize: 9, fontFamily: 'Geist Mono, Courier New, monospace' }}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="var(--color-text-secondary)"
              strokeWidth={1.5}
              dot={{ fill: 'var(--color-text-secondary)', r: 2.5 }}
              activeDot={{ r: 4, fill: 'var(--color-text-primary)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
