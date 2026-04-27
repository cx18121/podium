import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { PrimaryButton } from '../components/common/PrimaryButton';
import { SessionListItem } from '../components/SessionListItem/SessionListItem';
import { StorageQuotaBar } from '../components/StorageQuotaBar/StorageQuotaBar';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal/DeleteConfirmModal';
import { SparklineChart, computeTrendDirection } from '../components/SparklineChart/SparklineChart';
import SessionHeatmap from '../components/SessionHeatmap/SessionHeatmap';

interface HistoryViewProps {
  onOpenSession: (id: number) => void;
  onRecordNew: () => void;
}

export default function HistoryView({ onOpenSession, onRecordNew }: HistoryViewProps) {
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);

  const sessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().toArray(), []);

  if (sessions === undefined) {
    return (
      <div aria-busy="true" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--color-bg)', color: 'var(--color-text-muted)',
        fontSize: '13px',
      }}>
        Loading...
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--color-bg)', padding: '32px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Dot grid */}
        <div aria-hidden="true" style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '24px',
          maxWidth: '380px',
          textAlign: 'center',
          animation: 'fade-up 0.4s ease-out both',
        }}>
          {/* Ghost card preview */}
          <div aria-hidden="true" style={{
            width: '220px',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '12px',
            opacity: 0.45,
            userSelect: 'none',
          }}>
            <div style={{ height: '9px', borderRadius: '5px', background: 'var(--color-surface-raised)', width: '65%' }} />
            <div style={{ height: '32px', borderRadius: '6px', background: 'var(--color-surface-raised)', width: '28%' }} />
            <div style={{ height: '7px', borderRadius: '4px', background: 'var(--color-surface-raised)', width: '45%' }} />
          </div>

          {/* Copy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}>
              Your sessions will appear here.
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.65,
              margin: 0,
            }}>
              Each one gives you a scorecard, annotated playback, and a breakdown of filler words and pauses.
            </p>
          </div>

          <PrimaryButton onClick={onRecordNew}>Start Recording</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100svh', background: 'var(--color-bg)' }}>

      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        height: '52px',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <span style={{
          fontSize: '14px', fontWeight: 600,
          color: 'var(--color-text-primary)',
          letterSpacing: '-0.01em',
        }}>
          Past Sessions
        </span>
        <PrimaryButton size="sm" onClick={onRecordNew}>+ New Session</PrimaryButton>
      </header>

      <div style={{ padding: '32px', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Activity heatmap */}
        <div style={{ marginBottom: '40px' }}>
          <SessionHeatmap
            sessions={sessions}
            onDayClick={setFilterDate}
            selectedDate={filterDate}
          />
        </div>

        {/* Filter header */}
        {filterDate && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {filterDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button
              onClick={() => setFilterDate(null)}
              className="btn-ghost"
              style={{ fontSize: '12px' }}
            >
              Clear ×
            </button>
          </div>
        )}

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(filterDate
            ? sessions.filter(s => {
                const d = new Date(s.createdAt);
                return d.getFullYear() === filterDate.getFullYear()
                  && d.getMonth() === filterDate.getMonth()
                  && d.getDate() === filterDate.getDate();
              })
            : sessions
          ).map((s) => (
            <SessionListItem
              key={s.id}
              session={s}
              onOpen={() => onOpenSession(s.id!)}
              onDelete={() => setDeleteTargetId(s.id!)}
            />
          ))}
        </div>

        {/* Storage — contextual info, not header chrome */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <StorageQuotaBar />
        </div>

        {/* Progress sparklines — teaser when <3 sessions */}
        {sessions.length > 0 && sessions.length < 3 && (
          <div style={{ marginTop: '48px' }}>
            <p className="section-label" style={{ marginBottom: '10px' }}>Progress</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Record {3 - sessions.length} more session{3 - sessions.length !== 1 ? 's' : ''} to see your trend.
            </p>
          </div>
        )}

        {/* Progress sparklines */}
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
            <div style={{ marginTop: '48px' }}>
              <p className="section-label" style={{ marginBottom: '16px' }}>Progress</p>
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-5">
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
      </div>

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
