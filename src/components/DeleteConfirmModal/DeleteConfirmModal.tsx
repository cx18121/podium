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
          padding: '24px',
          maxWidth: '340px',
          width: '100%',
          margin: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2 style={{
          fontWeight: 600,
          fontSize: '0.9375rem',
          letterSpacing: '-0.01em',
          color: 'var(--color-text-primary)',
          margin: 0,
        }}>
          Delete this session?
        </h2>
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '13px',
          lineHeight: 1.55,
          margin: 0,
        }}>
          This permanently removes the recording and its scorecard.
        </p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
          <button onClick={onCancel} className="btn-secondary focus-ring">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-destructive btn-destructive-sm focus-ring-destructive">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
