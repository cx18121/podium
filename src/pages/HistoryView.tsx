import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { PrimaryButton } from '../components/common/PrimaryButton';
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
      <div aria-busy="true" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--color-bg)', color: 'var(--color-text-secondary)',
      }}>
        Loading sessions...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100svh',
        background: 'var(--color-bg)',
        color: 'var(--color-text-primary)',
        gap: '16px',
        padding: '32px',
      }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          No sessions yet
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '380px', lineHeight: 1.6 }}>
          Record your first practice session to see your history and track your progress.
        </p>
        <PrimaryButton onClick={onRecordNew}>Start Recording</PrimaryButton>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-6 sm:px-8 sm:py-10"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100svh',
        background: 'var(--color-bg)',
        gap: '32px',
        maxWidth: '768px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* Header row */}
      <div style={{ width: '100%', maxWidth: '672px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.625rem',
          letterSpacing: '-0.03em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          Past Sessions
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <StorageQuotaBar />
          <PrimaryButton size="sm" onClick={onRecordNew}>Start Recording</PrimaryButton>
        </div>
      </div>

      {/* Session list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '672px' }}>
        {sessions.map((s) => (
          <SessionListItem
            key={s.id}
            session={s}
            onOpen={() => onOpenSession(s.id!)}
            onDelete={() => setDeleteTargetId(s.id!)}
          />
        ))}
      </div>

      {/* Progress sparklines — only meaningful with enough data points */}
      {sessions.length >= 3 && (() => {
        const recentSessions = sessions.slice(0, 10).reverse();
        const dimensionKeys: { key: string; label: string }[] = [
          { key: 'eyeContact', label: 'Eye Contact' },
          { key: 'fillers', label: 'Fillers' },
          { key: 'pacing', label: 'Pacing' },
          { key: 'expressiveness', label: 'Expressiveness' },
          { key: 'gestures', label: 'Gestures' },
        ];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '672px' }}>
            <h2 className="text-caps" style={{ color: 'var(--color-text-muted)', margin: 0 }}>
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
