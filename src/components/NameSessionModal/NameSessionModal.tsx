// src/components/NameSessionModal/NameSessionModal.tsx
// Shown after Stop, before the Dexie save — locked user decision (CONTEXT.md: Session naming).
// Confirm saves with the custom name; Skip saves with the auto date/time title.
import { useState } from 'react';

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
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        zIndex: 50,
        padding: '16px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: '#0b1022',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '380px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.7)',
        animation: 'scale-in 0.2s ease-out both',
      }}>
        <h2
          id="name-session-heading"
          style={{
            fontFamily: 'Syne, system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '-0.025em',
            color: '#e4e9f5',
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
          autoFocus
          style={{
            width: '100%',
            padding: '12px 16px',
            background: '#101828',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '10px',
            color: '#e4e9f5',
            fontSize: '14px',
            fontFamily: 'Figtree',
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            boxSizing: 'border-box',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(91,143,255,0.50)';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(91,143,255,0.12)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleSave}
            disabled={name.trim().length === 0}
            style={{
              width: '100%',
              height: '48px',
              background: name.trim().length === 0
                ? 'rgba(91,143,255,0.25)'
                : 'linear-gradient(135deg, #5b8fff 0%, #3d6ef7 100%)',
              color: name.trim().length === 0 ? 'rgba(255,255,255,0.35)' : 'white',
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              borderRadius: '12px',
              border: 'none',
              cursor: name.trim().length === 0 ? 'not-allowed' : 'pointer',
              boxShadow: name.trim().length === 0 ? 'none' : '0 4px 20px rgba(91,143,255,0.28)',
              transition: 'all 0.18s ease',
            }}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#5b8fff] focus-visible:outline-offset-2"
          >
            Save Session
          </button>

          <button
            onClick={handleSkip}
            style={{
              fontSize: '13px',
              color: '#5e6f94',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'center',
              fontFamily: 'Figtree',
              transition: 'color 0.15s ease',
              padding: '4px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#e4e9f5'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#5e6f94'; }}
          >
            Skip — use date/time name
          </button>
        </div>
      </div>
    </div>
  );
}
