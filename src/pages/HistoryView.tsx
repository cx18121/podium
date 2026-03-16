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
      <div aria-busy="true" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: '#060911', color: '#5e6f94',
        fontFamily: 'Figtree',
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
        background: '#060911',
        color: '#e4e9f5',
        gap: '16px',
        padding: '32px',
      }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.02em',
          color: '#e4e9f5',
          margin: 0,
        }}>
          No sessions yet
        </h1>
        <p style={{ fontSize: '14px', color: '#5e6f94', textAlign: 'center', maxWidth: '380px', fontFamily: 'Figtree', lineHeight: 1.6 }}>
          Record your first practice session to see your history and track your progress.
        </p>
        <button
          onClick={onRecordNew}
          className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-2"
          style={{
            padding: '0 32px', height: '48px',
            background: 'linear-gradient(135deg, #5b8fff 0%, #3d6ef7 100%)',
            color: 'white', fontFamily: 'Figtree, system-ui, sans-serif',
            fontWeight: 600, fontSize: '14px', borderRadius: '12px', border: 'none',
            cursor: 'pointer', boxShadow: '0 4px 20px rgba(91,143,255,0.30)',
            transition: 'all 0.18s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 28px rgba(91,143,255,0.46)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(91,143,255,0.30)'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Start Recording
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100svh',
      background: '#060911',
      padding: '40px 32px',
      gap: '32px',
      maxWidth: '768px',
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Header row */}
      <div style={{ width: '100%', maxWidth: '672px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <h1 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.25rem',
          letterSpacing: '-0.025em',
          color: '#e4e9f5',
          margin: 0,
        }}>
          Past Sessions
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <StorageQuotaBar />
          <button
            onClick={onRecordNew}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-2"
            style={{
              padding: '0 20px', height: '40px',
              background: 'linear-gradient(135deg, #5b8fff 0%, #3d6ef7 100%)',
              color: 'white', fontFamily: 'Figtree, system-ui, sans-serif',
              fontWeight: 600, fontSize: '13px', borderRadius: '10px', border: 'none',
              cursor: 'pointer', whiteSpace: 'nowrap',
              boxShadow: '0 2px 16px rgba(91,143,255,0.28)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(91,143,255,0.44)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 16px rgba(91,143,255,0.28)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Start Recording
          </button>
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

      {/* Progress sparklines */}
      {(() => {
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
            <h2 style={{
              fontSize: '11px',
              fontFamily: 'Figtree',
              fontWeight: 600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#363e55',
              margin: 0,
            }}>
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
