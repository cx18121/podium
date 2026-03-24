// src/components/NameSessionModal/NameSessionModal.tsx
// Shown after Stop, before the Dexie save — locked user decision (CONTEXT.md: Session naming).
// Confirm saves with the custom name; Skip saves with the auto date/time title.
import { useState } from 'react';
import { PrimaryButton } from '../common/PrimaryButton';

export interface NameSessionModalProps {
  autoTitle: string;
  onConfirm: (title: string) => void;
  onSkip: () => void;
}

export function NameSessionModal({ autoTitle, onConfirm, onSkip: _onSkip }: NameSessionModalProps) {
  const [name, setName] = useState(autoTitle);

  const handleSave = () => {
    if (name.trim().length === 0) return;
    onConfirm(name.trim());
  };

  const handleSkip = () => {
    onConfirm(autoTitle);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-session-heading"
      className="dialog-overlay"
      style={{ padding: '16px' }}
    >
      <div
        className="dialog-panel"
        style={{
          padding: '32px',
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        <h2
          id="name-session-heading"
          style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.025em',
            color: 'var(--color-text-primary)',
            margin: 0,
          }}
        >
          Name this session
        </h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          aria-label="Session name"
          maxLength={100}
          autoFocus
          className="input-field"
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <PrimaryButton
            type="button"
            disabled={name.trim().length === 0}
            onClick={handleSave}
            style={{ width: '100%' }}
          >
            Save Session
          </PrimaryButton>

          <button
            onClick={handleSkip}
            className="btn-ghost"
            style={{ textAlign: 'center', padding: '4px' }}
          >
            Keep the default name
          </button>
        </div>
      </div>
    </div>
  );
}
