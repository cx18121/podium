import { useState } from 'react';
import { PrimaryButton } from '../common/PrimaryButton';

export interface NameSessionModalProps {
  autoTitle: string;
  onConfirm: (title: string) => void;
}

export function NameSessionModal({ autoTitle, onConfirm }: NameSessionModalProps) {
  const [name, setName] = useState(autoTitle);

  const handleSave = () => {
    if (name.trim().length === 0) return;
    onConfirm(name.trim());
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
          padding: '28px',
          width: '100%',
          maxWidth: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <h2
          id="name-session-heading"
          style={{
            fontWeight: 600,
            fontSize: '1rem',
            letterSpacing: '-0.02em',
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <PrimaryButton
            type="button"
            disabled={name.trim().length === 0}
            onClick={handleSave}
            style={{ width: '100%' }}
          >
            Save
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
