// src/spikes/speech-spike.ts
import type { SpikeResult } from './mediapipe-spike';

export async function runSpeechSpike(
  onUpdate: (result: SpikeResult) => void
): Promise<SpikeResult> {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    const result: SpikeResult = {
      status: 'error',
      message: 'SpeechRecognition not available in this browser (use Chrome or Edge)',
    };
    onUpdate(result);
    return result;
  }

  onUpdate({
    status: 'pending',
    message: 'Say "um", "uh", "like", "you know" clearly into microphone. Recording for 15 seconds...',
  });

  return new Promise((resolve) => {
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const transcripts: { text: string; isFinal: boolean; timestamp: number }[] = [];

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        transcripts.push({
          text: result[0].transcript,
          isFinal: result.isFinal,
          timestamp: Date.now(),
        });
        onUpdate({
          status: 'pending',
          message: `Transcript so far: "${result[0].transcript}" (${result.isFinal ? 'final' : 'interim'})`,
        });
      }
    };

    recognition.onerror = (event: any) => {
      const result: SpikeResult = {
        status: 'error',
        message: `SpeechRecognition error: ${event.error}`,
      };
      onUpdate(result);
      resolve(result);
    };

    recognition.start();

    setTimeout(() => {
      recognition.stop();

      // Analyze transcripts for filler words
      const fillerWords = ['um', 'uh', 'like', 'you know'];
      const allText = transcripts.map((t) => t.text.toLowerCase()).join(' ');
      const foundFillers = fillerWords.filter((f) => allText.includes(f));
      const finalTranscripts = transcripts.filter((t) => t.isFinal).map((t) => t.text);

      // SPIKE QUESTION: Are filler words present in the transcript or suppressed?
      // Document the exact finding here as a locked fact for Phase 2.
      const spikeResult: SpikeResult = {
        status: 'success',
        message: foundFillers.length > 0
          ? `FINDING: Filler words PRESERVED in transcript — found: [${foundFillers.join(', ')}]`
          : `FINDING: Filler words SUPPRESSED or not spoken — none found in transcript`,
        detail: [
          `All final transcripts: ${JSON.stringify(finalTranscripts)}`,
          `Full transcript text: "${allText}"`,
          `Action for Phase 2: ${foundFillers.length > 0
            ? 'Web Speech API preserves fillers — use direct transcript scanning'
            : 'Chrome may suppress fillers — evaluate Whisper.wasm fallback (AUD-v2-01)'
          }`,
        ].join('\n'),
      };
      onUpdate(spikeResult);
      resolve(spikeResult);
    }, 15_000);
  });
}
