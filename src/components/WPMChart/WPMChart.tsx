// src/components/WPMChart/WPMChart.tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
      background: '#0b1022',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '18px',
      padding: '24px',
      width: '100%',
      fontFamily: 'Figtree, system-ui, sans-serif',
    }}>
      <h3 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#8a9bc2',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        margin: '0 0 16px 0',
      }}>
        Speaking Pace
      </h3>
      {(!wpmWindows || chartData.length === 0) ? (
        <p style={{ fontSize: '14px', color: '#5e6f94', margin: 0 }}>
          No data available
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#5e6f94', fontSize: 11, fontFamily: 'Figtree' }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#5e6f94', fontSize: 11, fontFamily: 'Figtree' }}
              tickLine={false}
              unit=" wpm"
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            />
            <Tooltip
              contentStyle={{
                background: '#0d1526',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '10px',
                fontFamily: 'Figtree',
                fontSize: '13px',
                color: '#e4e9f5',
              }}
              formatter={(value) => [`${value} wpm`, 'Pace']}
            />
            <Line
              type="monotone"
              dataKey="wpm"
              stroke="#5b8fff"
              strokeWidth={2}
              dot={{ fill: '#5b8fff', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
