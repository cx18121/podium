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
      className="fixed inset-0 flex items-center justify-center bg-black/70 z-50 p-4"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-md flex flex-col gap-6 shadow-2xl">
        <h2 id="name-session-heading" className="text-xl font-bold text-white">
          Name this session
        </h2>

        <p className="text-gray-400 text-sm">
          Give your session a name, or skip to use the auto-generated date and time.
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
          aria-label="Session name"
          autoFocus
        />

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleSkip}
            className="px-5 py-2.5 text-gray-400 hover:text-white transition-colors text-sm font-medium"
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={name.trim().length === 0}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
