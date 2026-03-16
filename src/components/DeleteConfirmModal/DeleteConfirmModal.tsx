interface DeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.75)',
        zIndex: 50,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        background: '#0b1022',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '20px',
        padding: '28px',
        maxWidth: '360px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 32px 64px rgba(0,0,0,0.7)',
        animation: 'scale-in 0.2s ease-out both',
        margin: '16px',
      }}>
        <h2 style={{
          fontFamily: 'Syne, system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.125rem',
          letterSpacing: '-0.02em',
          color: '#e4e9f5',
          margin: 0,
        }}>
          Delete this session?
        </h2>
        <p style={{
          color: '#5e6f94',
          fontSize: '13px',
          lineHeight: 1.6,
          margin: 0,
          fontFamily: 'Figtree',
        }}>
          This permanently removes the recording and its scorecard. This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0 18px',
              height: '40px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#e4e9f5',
              fontSize: '13px',
              fontFamily: 'Figtree',
              fontWeight: 500,
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(255,255,255,0.3)] focus-visible:outline-offset-1"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            Keep Session
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0 18px',
              height: '40px',
              background: 'rgba(244,63,94,0.12)',
              border: '1px solid rgba(244,63,94,0.28)',
              color: '#f43f5e',
              fontSize: '13px',
              fontFamily: 'Figtree',
              fontWeight: 600,
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f43f5e] focus-visible:outline-offset-1"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f43f5e';
              e.currentTarget.style.color = 'white';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(244,63,94,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(244,63,94,0.12)';
              e.currentTarget.style.color = '#f43f5e';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Delete Session
          </button>
        </div>
      </div>
    </div>
  );
}
