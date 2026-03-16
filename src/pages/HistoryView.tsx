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
      <div aria-busy="true" className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto w-full flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white gap-4">
        <h1 className="text-xl font-semibold text-white">No sessions yet</h1>
        <p className="text-sm text-gray-400">Record your first session to see your history here.</p>
        <button
          onClick={onRecordNew}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
        >
          Record New Session
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-950 text-white p-8 gap-6 max-w-3xl mx-auto w-full">
      <h1 className="text-xl font-semibold">Session History</h1>

      <button
        onClick={onRecordNew}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
      >
        Record New Session
      </button>

      <div className="w-full max-w-2xl flex items-center gap-4 px-4 text-gray-400 text-sm">
        <span className="flex-1">Session</span>
        <span className="whitespace-nowrap">Date</span>
        <span className="whitespace-nowrap">Duration</span>
        <span className="w-16 text-right">Score</span>
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
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
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

      <StorageQuotaBar />

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
