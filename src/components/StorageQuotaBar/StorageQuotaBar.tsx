import { useEffect, useState } from 'react';

interface StorageInfo {
  usedMB: number;
  totalMB: number;
  pct: number;
}

export function StorageQuotaBar() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    if (!navigator.storage || !navigator.storage.estimate) return;
    navigator.storage.estimate().then((estimate) => {
      const used = estimate.usage ?? 0;
      const total = estimate.quota ?? 0;
      if (total === 0) return;
      const usedMB = Math.round(used / (1024 * 1024));
      const totalMB = Math.round(total / (1024 * 1024));
      const pct = Math.min(100, Math.round((used / total) * 100));
      setStorageInfo({ usedMB, totalMB, pct });
    });
  }, []);

  if (!storageInfo) return null;

  const { usedMB, totalMB, pct } = storageInfo;
  const isCritical = pct > 95;
  const isWarning = pct > 80;

  const fillColor = isCritical ? '#ef4444' : isWarning ? '#fbbf24' : '#6366f1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
      <div style={{
        width: '100%', height: '4px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '9999px',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          borderRadius: '9999px',
          background: fillColor,
          width: `${pct}%`,
          transition: 'width 0.4s ease',
          boxShadow: `0 0 6px ${fillColor}66`,
        }} />
      </div>
      <span style={{
        fontSize: '11px',
        fontFamily: 'Figtree',
        color: isCritical ? 'var(--color-destructive)' : 'var(--color-text-muted)',
        letterSpacing: '0.02em',
      }}>
        {usedMB} MB of {totalMB} MB
      </span>
      {isCritical && (
        <span style={{ fontSize: '11px', color: 'var(--color-destructive)', fontFamily: 'Figtree' }}>
          Storage almost full. Delete older sessions to keep recording.
        </span>
      )}
    </div>
  );
}
