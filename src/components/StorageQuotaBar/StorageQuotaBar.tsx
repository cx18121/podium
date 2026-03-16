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
      : 'bg-[#6366f1]';

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="w-full h-1.5 bg-[#1a2235] rounded-full">
        <div
          className={`h-1.5 rounded-full motion-safe:transition-all ${fillClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[13px] tracking-wide ${isCritical ? 'text-red-400' : 'text-[#94a3b8]'}`}>
        {usedMB} MB of {totalMB} MB
      </span>
      {isCritical && (
        <span className="text-red-400 text-[13px]">
          Storage almost full. Delete older sessions to keep recording.
        </span>
      )}
    </div>
  );
}
