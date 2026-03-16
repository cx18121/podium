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

  const fillClass = isCritical
    ? 'bg-red-500'
    : isWarning
      ? 'bg-amber-400'
      : 'bg-gray-600';

  const labelClass = isCritical ? 'text-xs text-red-400' : 'text-xs text-gray-400';

  return (
    <div className="flex flex-col gap-1 w-full max-w-2xl">
      <span className={labelClass}>Storage used: {usedMB} MB of {totalMB} MB</span>
      <div className="w-full h-1 bg-gray-800 rounded-full">
        <div
          className={`h-1 rounded-full transition-all ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isCritical && (
        <span className="text-red-400 text-xs">
          Storage almost full. Delete older sessions to keep recording.
        </span>
      )}
      {!isCritical && isWarning && (
        <span className="text-amber-400 text-xs">
          Storage getting full. Consider deleting older sessions.
        </span>
      )}
    </div>
  );
}
