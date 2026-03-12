// src/spikes/SpikeRunner.tsx
import { useState } from 'react';
import type { SpikeResult } from './mediapipe-spike';
import { runMediapipeSpike } from './mediapipe-spike';
import { runWebmSpike } from './webm-spike';
import { runSpeechSpike } from './speech-spike';

interface SpikeState {
  mediapipe: SpikeResult | null;
  webm: SpikeResult | null;
  speech: SpikeResult | null;
}

export default function SpikeRunner() {
  const [results, setResults] = useState<SpikeState>({
    mediapipe: null,
    webm: null,
    speech: null,
  });
  const [running, setRunning] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getStream = async () => {
    if (stream) return stream;
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setStream(s);
    return s;
  };

  const runSpike = async (name: keyof SpikeState) => {
    setRunning(name);
    const update = (result: SpikeResult) =>
      setResults((prev) => ({ ...prev, [name]: result }));

    try {
      if (name === 'mediapipe') {
        await runMediapipeSpike(update);
      } else if (name === 'webm') {
        const s = await getStream();
        await runWebmSpike(s, update);
      } else if (name === 'speech') {
        await runSpeechSpike(update);
      }
    } catch (e: any) {
      update({ status: 'error', message: e.message });
    }
    setRunning(null);
  };

  const statusColor = (r: SpikeResult | null) => {
    if (!r) return 'text-gray-500';
    if (r.status === 'success') return 'text-green-400';
    if (r.status === 'error') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-mono">
      <h1 className="text-2xl font-bold mb-2">Phase 1 Architecture Spikes</h1>
      <p className="text-gray-400 text-sm mb-8">Run each spike manually. Document results below before Phase 2.</p>

      {(['mediapipe', 'webm', 'speech'] as const).map((name) => (
        <div key={name} className="mb-8 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold capitalize">{name} Spike</h2>
            <button
              onClick={() => runSpike(name)}
              disabled={running !== null}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded text-sm"
            >
              {running === name ? 'Running...' : 'Run Spike'}
            </button>
          </div>
          {results[name] && (
            <div>
              <p className={`text-sm ${statusColor(results[name])}`}>
                [{results[name]!.status.toUpperCase()}] {results[name]!.message}
              </p>
              {results[name]!.detail && (
                <pre className="text-xs text-gray-400 mt-2 whitespace-pre-wrap break-all">
                  {results[name]!.detail}
                </pre>
              )}
            </div>
          )}
          {!results[name] && (
            <p className="text-gray-600 text-sm">Not yet run.</p>
          )}
        </div>
      ))}

      <div className="border border-yellow-700 rounded-lg p-4 mt-8">
        <h2 className="text-yellow-400 font-semibold mb-2">Manual Steps Required</h2>
        <ol className="text-sm text-gray-300 list-decimal list-inside space-y-1">
          <li>Run MediaPipe spike on <strong>Mac Chrome</strong> — record result</li>
          <li>Run MediaPipe spike on <strong>Windows Chrome</strong> — record result</li>
          <li>Run WebM spike after granting camera/mic access</li>
          <li>Run Speech spike — say "um", "uh", "like" clearly during 15-second window</li>
          <li>Document all findings in 01-02-SUMMARY.md before starting Plan 01-03</li>
        </ol>
      </div>
    </div>
  );
}
