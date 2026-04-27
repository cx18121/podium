import { useEffect, useState } from 'react';

interface StorageInfo { usedMB: number; totalMB: number; pct: number; }

export function StorageQuotaBar() {
  const [info, setInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    if (!navigator.storage?.estimate) return;
    navigator.storage.estimate().then((est) => {
      const used = est.usage ?? 0;
      const total = est.quota ?? 0;
      if (total === 0) return;
      setInfo({
        usedMB: Math.round(used / (1024 * 1024)),
        totalMB: Math.round(total / (1024 * 1024)),
        pct: Math.min(100, Math.round((used / total) * 100)),
      });
    });
  }, []);

  if (!info) return null;

  const isCritical = info.pct > 95;
  const isWarning = info.pct > 80;
  const fillColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : 'var(--color-text-muted)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '80px' }}>
      <div style={{ height: '3px', background: 'rgba(255,255,255,0.07)', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '9999px', background: fillColor, width: `${info.pct}%`, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '10px', color: isCritical ? 'var(--color-destructive)' : 'var(--color-text-muted)' }}>
        {info.usedMB} / {info.totalMB} MB
      </span>
      {isCritical && (
        <span style={{ fontSize: '10px', color: 'var(--color-destructive)' }}>Storage almost full</span>
      )}
    </div>
  );
}
