// src/components/NameSessionModal/NameSessionModal.tsx
// Shown after Stop, before the Dexie save — locked user decision (CONTEXT.md: Session naming).
// Confirm saves with the custom name; Skip saves with the auto date/time title.
import { useState } from 'react';

export interface NameSessionModalProps {
  autoTitle: string;
  onConfirm: (title: string) => void;
  onSkip: () => void;  // convenience prop; App should call onConfirm(autoTitle) inside its onSkip handler
}

export function NameSessionModal({ autoTitle, onConfirm, onSkip: _onSkip }: NameSessionModalProps) {
  const [name, setName] = useState(autoTitle);

  const handleSave = () => {
    if (name.trim().length === 0) return;
    onConfirm(name.trim());
  };

  const handleSkip = () => {
    // Skip = use auto title. Call onConfirm (not onSkip) so App's save logic
    // runs the same path whether the user typed a name or skipped.
    onConfirm(autoTitle);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="name-session-heading"
      className="fixed inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.7)] z-50 p-4"
    >
      <div className="bg-[#111827] border border-[rgba(255,255,255,0.10)] rounded-[20px] p-8 w-full max-w-sm flex flex-col gap-6 shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
        <h2 id="name-session-heading" className="text-xl font-semibold text-[#f1f5f9]">
          Name this session
        </h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-[#1a2235] border border-[rgba(255,255,255,0.10)] rounded-lg text-[#f1f5f9] placeholder-[#475569] focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[#6366f1] focus:ring-offset-0 motion-safe:transition-colors motion-safe:duration-150"
          aria-label="Session name"
          autoFocus
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={handleSave}
            disabled={name.trim().length === 0}
            className="w-full h-[48px] bg-[#6366f1] hover:bg-[#818cf8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl motion-safe:transition-shadow motion-safe:duration-200 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6366f1] focus-visible:outline-offset-2"
          >
            Save Session
          </button>
          <button
            onClick={handleSkip}
            className="text-[13px] text-[#94a3b8] hover:text-[#f1f5f9] motion-safe:transition-colors motion-safe:duration-150 text-center no-underline"
          >
            Skip — use date/time name
          </button>
        </div>
      </div>
    </div>
  );
}
