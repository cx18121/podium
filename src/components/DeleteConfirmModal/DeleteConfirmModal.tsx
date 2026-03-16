interface DeleteConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.7)] flex items-center justify-center z-50">
      <div className="bg-[#111827] border border-[rgba(255,255,255,0.10)] rounded-[20px] p-6 max-w-sm w-full flex flex-col gap-4 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
        <h2 className="text-[#f1f5f9] font-semibold text-xl">Delete this session?</h2>
        <p className="text-[#94a3b8] text-sm">
          This permanently removes the recording and its scorecard. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#1a2235] hover:bg-[#111827] border border-[rgba(255,255,255,0.07)] text-[#f1f5f9] text-sm rounded-lg motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[rgba(255,255,255,0.3)] focus-visible:outline-offset-1"
          >
            Keep Session
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#ef4444] hover:bg-[#f87171] text-white text-sm font-semibold rounded-lg motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ef4444] focus-visible:outline-offset-1"
          >
            Delete Session
          </button>
        </div>
      </div>
    </div>
  );
}
