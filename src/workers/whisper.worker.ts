// src/workers/whisper.worker.ts
// ES MODULE WORKER — { type: 'module' } required by caller.
// @huggingface/transformers requires ES module imports.
// NEVER convert to classic-mode (importScripts).

import { pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'init') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transcriber = await (pipeline as any)(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          progress_callback: (progress: { status: string; progress?: number; file?: string }) => {
            self.postMessage({ type: 'progress', data: progress });
          },
        }
      );
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message });
    }
  }

  if (type === 'transcribe') {
    if (!transcriber) {
      self.postMessage({ type: 'error', message: 'Transcriber not initialized' });
      return;
    }
    try {
      const audioData: Float32Array = e.data.audioData;
      const result = await transcriber(audioData, {
        // Retain disfluencies (um, uh, like) in output — without this,
        // Whisper normalizes them away, defeating the purpose of WHIS-01.
        // Source: openai/whisper discussions #1174
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial_prompt: 'Umm, let me think like, hmm... Okay, here is what I am, like, thinking.',
      } as any);
      // result can be { text: string } or { text: string }[]
      const text = Array.isArray(result)
        ? result.map(r => r.text).join(' ')
        : (result as { text: string }).text;
      self.postMessage({ type: 'result', text });
    } catch (err) {
      self.postMessage({ type: 'error', message: (err as Error).message });
    }
  }
};
