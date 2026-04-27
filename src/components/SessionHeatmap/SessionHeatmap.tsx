import { useState, useRef } from 'react';
import type { Session } from '../../db/db';

interface SessionHeatmapProps {
  sessions: Session[];
  onDayClick?: (date: Date | null) => void;
  selectedDate?: Date | null;
}

interface DayData {
  date: Date;
  avgScore: number | null;
  count: number;
  hasSession: boolean;
  isFuture: boolean;
}

interface TooltipState {
  day: DayData;
  x: number;
  y: number;
}

const WEEKS = 53;
const CELL = 13;
const GAP = 3;
const STEP = CELL + GAP;

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function cellFill(count: number): string {
  if (count === 0) return 'var(--color-surface-raised)';
  const opacity = Math.min(0.18 + (count - 1) * 0.18, 0.70);
  return `rgba(200,200,200,${opacity.toFixed(2)})`;
}

function cellBorder(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.05)';
  const opacity = Math.min(0.10 + (count - 1) * 0.08, 0.32);
  return `rgba(200,200,200,${opacity.toFixed(2)})`;
}

const SHORT_DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function SessionHeatmap({ sessions, onDayClick, selectedDate }: SessionHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Map dateKey → {total, count}
  const dayMap = new Map<string, { total: number; count: number }>();
  for (const s of sessions) {
    const key = toDateKey(new Date(s.createdAt));
    const score = s.scorecard?.overall ?? null;
    const existing = dayMap.get(key) ?? { total: 0, count: 0 };
    dayMap.set(key, {
      total: existing.total + (score ?? 0),
      count: existing.count + 1,
    });
  }

  // Start from Sunday 52 weeks ago
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay() - (WEEKS - 1) * 7);

  const days: DayData[] = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = toDateKey(date);
    const entry = dayMap.get(key);
    days.push({
      date,
      avgScore: entry && entry.count > 0
        ? Math.round(entry.total / entry.count)
        : null,
      count: entry?.count ?? 0,
      hasSession: !!entry,
      isFuture: date > today,
    });
  }

  const columns: DayData[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    columns.push(days.slice(w * 7, w * 7 + 7));
  }

  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  let lastLabelCol = -4;
  columns.forEach((col, ci) => {
    const m = col[0].date.getMonth();
    if (m !== lastMonth && ci - lastLabelCol >= 3) {
      monthLabels.push({ label: MONTHS[m], col: ci });
      lastMonth = m;
      lastLabelCol = ci;
    }
  });

  const gridWidth = WEEKS * STEP - GAP;

  const handleCellEnter = (e: React.MouseEvent, day: DayData) => {
    if (day.isFuture) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      day,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleCellMove = (e: React.MouseEvent, day: DayData) => {
    if (day.isFuture) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip(prev => prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <p className="section-label" style={{ marginBottom: '16px' }}>Activity</p>

      <div style={{ overflowX: 'auto' }} onMouseLeave={() => setTooltip(null)}>
        <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'flex-start', minWidth: 'max-content' }}>

          {/* Day labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px`, paddingTop: '22px', flexShrink: 0, width: '28px' }}>
            {SHORT_DAYS.map((label, i) => (
              <div key={i} style={{
                height: `${CELL}px`,
                fontSize: '10px',
                color: label ? 'var(--color-text-muted)' : 'transparent',
                lineHeight: `${CELL}px`,
                textAlign: 'right',
                userSelect: 'none',
              }}>
                {label || '.'}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div>
            {/* Month labels */}
            <div style={{ position: 'relative', height: '20px', width: `${gridWidth}px`, marginBottom: '2px' }}>
              {monthLabels.map(({ label, col }) => (
                <span key={`${label}-${col}`} style={{
                  position: 'absolute',
                  left: `${col * STEP}px`,
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                  lineHeight: '20px',
                  userSelect: 'none',
                }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Cells */}
            <div style={{ display: 'flex', gap: `${GAP}px` }}>
              {columns.map((col, ci) => (
                <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: `${GAP}px` }}>
                  {col.map((day, di) => {
                    const isSelected = selectedDate
                      ? toDateKey(selectedDate) === toDateKey(day.date)
                      : false;
                    return (
                      <div
                        key={di}
                        onMouseEnter={(e) => handleCellEnter(e, day)}
                        onMouseMove={(e) => handleCellMove(e, day)}
                        onClick={() => {
                          if (day.isFuture || !day.hasSession) return;
                          onDayClick?.(isSelected ? null : day.date);
                        }}
                        style={{
                          width: `${CELL}px`,
                          height: `${CELL}px`,
                          borderRadius: '3px',
                          background: day.isFuture ? 'transparent' : cellFill(day.count),
                          border: isSelected
                            ? '2px solid var(--color-text-primary)'
                            : `1px solid ${day.isFuture ? 'transparent' : cellBorder(day.count)}`,
                          flexShrink: 0,
                          opacity: day.isFuture ? 0 : 1,
                          cursor: day.hasSession ? 'pointer' : 'default',
                          boxSizing: 'border-box',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend — right-aligned to grid edge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', marginLeft: '38px', width: `${gridWidth}px`, justifyContent: 'flex-end' }}>
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Fewer sessions</span>
          {[0, 1, 2, 4].map((count, i) => (
            <div key={i} style={{
              width: CELL, height: CELL, borderRadius: '3px',
              background: cellFill(count),
              border: `1px solid ${cellBorder(count)}`,
            }} />
          ))}
          <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: 'var(--color-text-primary)',
            pointerEvents: 'none',
            zIndex: 50,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '3px' }}>
            {tooltip.day.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {tooltip.day.hasSession ? (
            <div style={{ color: 'var(--color-text-secondary)' }}>
              {tooltip.day.count} session{tooltip.day.count !== 1 ? 's' : ''}
              {tooltip.day.avgScore !== null && (
                <span> · avg score <span style={{ color: tooltip.day.avgScore >= 70 ? '#10b981' : tooltip.day.avgScore >= 40 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>{tooltip.day.avgScore}</span></span>
              )}
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)' }}>No sessions</div>
          )}
        </div>
      )}
    </div>
  );
}
