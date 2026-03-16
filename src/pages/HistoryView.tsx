import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { SessionListItem } from '../components/SessionListItem/SessionListItem';
import { StorageQuotaBar } from '../components/StorageQuotaBar/StorageQuotaBar';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal/DeleteConfirmModal';
import { SparklineChart, computeTrendDirection } from '../components/SparklineChart/SparklineChart';

interface HistoryViewProps {
  onOpenSession: (id: number) => void;
  onRecordNew: () => void;
}

export default function HistoryView({ onOpenSession, onRecordNew }: HistoryViewProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray(), []);

  if (sessions === undefined) {
    return (
      <div aria-busy="true" className="flex items-center justify-center min-h-screen bg-[#080c14] text-[#94a3b8]">
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-screen bg-[#080c14] text-[#f1f5f9] gap-4">
        <h1 className="text-xl font-semibold text-[#f1f5f9]">No sessions yet</h1>
        <p className="text-sm text-[#94a3b8]">Record your first practice session to see your history and track your progress.</p>
        <button
          onClick={onRecordNew}
          className="px-6 py-3 bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold rounded-xl motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          Start Recording
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-[#080c14] text-white p-8 gap-6 max-w-3xl mx-auto w-full">
      <div className="w-full max-w-2xl flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-[#f1f5f9]">Past Sessions</h1>
        <div className="flex items-center gap-4">
          <StorageQuotaBar />
          <button
            onClick={onRecordNew}
            className="px-6 h-[44px] bg-[#6366f1] hover:bg-[#818cf8] text-white font-semibold rounded-xl text-sm motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-2"
          >
            Start Recording
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-2xl">
        {sessions.map((s) => (
          <SessionListItem
            key={s.id}
            session={s}
            onOpen={() => onOpenSession(s.id!)}
            onDelete={() => setDeleteTargetId(s.id!)}
          />
        ))}
      </div>

      {(() => {
        const recentSessions = sessions.slice(0, 10).reverse(); // oldest → newest for sparklines
        const dimensionKeys: { key: string; label: string }[] = [
          { key: 'eyeContact', label: 'Eye Contact' },
          { key: 'fillers', label: 'Fillers' },
          { key: 'pacing', label: 'Pacing' },
          { key: 'expressiveness', label: 'Expressiveness' },
          { key: 'gestures', label: 'Gestures' },
        ];
        return (
          <div className="flex flex-col gap-4 w-full max-w-2xl">
            <h2 className="text-sm font-semibold text-[#94a3b8] tracking-wide">
              Progress by Dimension
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {dimensionKeys.map(({ key, label }) => {
                const scores = recentSessions
                  .filter(s => s.scorecard !== null)
                  .map(s => s.scorecard!.dimensions[key] ?? 0);
                const trend = computeTrendDirection(scores);
                return (
                  <SparklineChart key={key} scores={scores} label={label} trend={trend} />
                );
              })}
            </div>
          </div>
        );
      })()}

      {deleteTargetId !== null && (
        <DeleteConfirmModal
          onConfirm={async () => {
            await db.sessions.delete(deleteTargetId!);
            setDeleteTargetId(null);
          }}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}
