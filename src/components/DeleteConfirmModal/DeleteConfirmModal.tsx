interface DeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="dialog-overlay">
      <div
        className="dialog-panel"
        style={{
          padding: '28px',
          maxWidth: '360px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          margin: '16px',
        }}
      >
        <h2 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.125rem',
          letterSpacing: '-0.02em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          Delete this session?
        </h2>
        <p style={{
          color: 'var(--color-text-secondary)',
          fontSize: '13px',
          lineHeight: 1.6,
          margin: 0,
        }}>
          This permanently removes the recording and its scorecard.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button onClick={onCancel} className="btn-secondary focus-ring">
            Keep Session
          </button>
          <button onClick={onConfirm} className="btn-destructive btn-destructive-sm focus-ring-destructive">
            Delete Session
          </button>
        </div>
      </div>
    </div>
  );
}
