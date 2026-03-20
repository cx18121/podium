# Pitch Practice

A browser-based presentation practice tool that records you and scores your delivery using on-device ML. No data leaves your device.

## What It Does

Record a practice session using your webcam and microphone. While you speak, real-time computer vision (MediaPipe) and speech recognition (Web Speech API) track your eye contact, filler words, pacing, expressiveness, and nervous gestures. After the session, Whisper.wasm re-analyzes the audio for accurate filler word counts. The review screen shows your annotated video with every event timestamped on an interactive timeline, a detailed scorecard, and analytics panels. All processing and storage happen locally in the browser.

## Features

### Scoring Dimensions

- **Eye contact** — gaze toward/away from camera via MediaPipe Face Landmarker
- **Filler words** — detects "um, uh, like, you know, so, actually, basically" via Web Speech API live + Whisper.wasm post-session for accurate counts
- **Pacing** — words per minute scored against a 120-160 wpm target; pause quality scored as a sub-dimension (deliberate vs. hesitation)
- **Facial expressiveness** — animated vs. flat delivery via facial landmark variance
- **Nervous gestures** — face touching and body swaying via MediaPipe Hand and Pose Landmarkers
- **Opening/closing strength** — scores the first and last 30 seconds for negative event density

### Analytics Panels

- Filler word breakdown by type and timing cluster
- WPM chart — speaking rate over 30-second windows
- Pauses in speech — count and average duration breakdown

### Review & Playback

- Annotated video playback with interactive timeline showing color-coded event markers
- Live captions during recording (Web Speech API)
- Post-session scorecard with weighted overall score across 6 dimensions

### Session History

- Session list with trendline charts per dimension
- Local storage via IndexedDB (Dexie) so sessions persist across visits
- Storage quota bar showing browser storage usage

## Privacy

Runs entirely in the browser. No server, no uploads, no accounts. Video, audio, and all analysis data stay in IndexedDB on your device.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- MediaPipe Vision (Face, Hand, Pose Landmarkers) via Web Worker
- Web Speech API (live transcript and captions)
- Whisper.wasm via `@huggingface/transformers` (post-session filler re-analysis)
- Dexie (IndexedDB wrapper) for session persistence
- Recharts for WPM chart
- Vitest + Testing Library for tests

## Getting Started

```bash
npm install
npm run dev
```

## Browser Requirements

**Chrome recommended** — full Web Speech API support and SharedArrayBuffer (required for Whisper.wasm). Firefox has partial support; Safari is not supported.
