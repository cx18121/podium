# Roadmap: Presentation Coach

## Overview

Build a fully client-side browser tool that records a user practicing a talk, runs five ML-driven analysis dimensions in the browser, and delivers annotated video playback with timestamped coaching events and a scorecard. The path: establish a verified technical foundation (recording + architecture spikes), wire all analysis pipelines, surface post-session review (annotated playback + scorecard), then close the loop with session history and progress tracking.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Recording** - Verified project scaffold, architecture spikes for the three HIGH-recovery-cost pitfalls, and a working recording pipeline that produces seekable WebM blobs persisted to IndexedDB
- [ ] **Phase 2: Analysis Pipeline** - All five analysis signals (eye contact, expressiveness, nervous gestures, filler words, pacing) running in the browser via a throttled ML Worker and Web Speech API, producing a complete timestamped event log for every session
- [x] **Phase 3: Post-Session Review** - Scorecard with per-dimension and overall scores, plus annotated video playback with a clickable event timeline — the product's core differentiator (completed 2026-03-15)
- [ ] **Phase 4: Session History** - Persistent session list, per-dimension trend charts, and storage quota management that makes improvement over time visible and safe

## Phase Details

### Phase 1: Foundation and Recording
**Goal**: The project scaffold is verified, the three highest-risk architectural unknowns are resolved as working or mitigated, and a user can complete a recording session that produces a correctly formed, seekable video file persisted to local storage.
**Depends on**: Nothing (first phase)
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, AUD-05
**Success Criteria** (what must be TRUE):
  1. User can grant camera/microphone permission and start a recording session; the UI shows only a timer and stop button with no other distractions
  2. User can stop recording and have the session saved — the saved video file is seekable (duration is not Infinity) and playable from any point
  3. MediaPipe inference runs inside a Web Worker without crashing on both Mac Chrome and Windows Chrome (verified spike — not assumed from docs)
  4. Chrome's Web Speech API behavior with um/uh filler words is empirically confirmed (suppressed or preserved), establishing the implementation path before filler detection is built
  5. The app calls navigator.storage.persist() so stored sessions are not silently evicted by the browser
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Vite 7 + React 19 + TypeScript scaffold, Tailwind v4, Vitest wired to jsdom, Dexie v4 schema v1, Wave 0 test stubs
- [x] 01-02-PLAN.md — Architecture spikes: MediaPipe classic-mode worker (all 3 models), WebM fix-webm-duration verification, Chrome filler-word suppression empirical test
- [x] 01-03-PLAN.md — Recording pipeline: getUserMedia, distraction-free session UI, MediaRecorder + fix-webm-duration, Dexie session save, navigator.storage.persist(), browser support warning

### Phase 2: Analysis Pipeline
**Goal**: Every session the user records is silently analyzed end-to-end — eye contact, facial expressiveness, nervous gestures, filler words, and pacing — producing a complete, timestamped event log committed to IndexedDB at session end.
**Depends on**: Phase 1
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04, VIS-05, AUD-01, AUD-02, AUD-03, AUD-04
**Success Criteria** (what must be TRUE):
  1. After a session ends, the IndexedDB events table contains timestamped records for all five signal types (eye contact, expressiveness, gesture, filler word, and pacing/pause events)
  2. During recording, the main thread UI (timer + stop button) remains fully responsive — MediaPipe inference runs only in the Web Worker, throttled to 5–10 fps
  3. Filler words (um, uh, like, you know) detected during a session appear as individual timestamped events with the specific word recorded
  4. Words per minute and significant pauses (over 2 seconds) are calculated from the transcript and available in the event log after the session ends
  5. Recording and stopping the session three times in a row leaves no MediaPipe memory leak — WASM heap returns to baseline between sessions
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — Production ML worker (init/frame/stop/cleanup protocol, pendingEvents, busy flag), useMLWorker hook with 150ms frame pump and ImageBitmap transfer, useRecording extended to compose worker lifecycle and flush visualEvents before onRecordingReady, Wave 0 test stubs for all 7 analysis modules (VIS-01, VIS-05)
- [ ] 02-02-PLAN.md — Visual analysis pure functions: eyeContact.ts (iris gaze, state transitions), expressiveness.ts (blendshape variance, 5s segments), gestures.ts (face-touch proximity + body sway), all wired into worker deriveEvents() (VIS-02, VIS-03, VIS-04)
- [ ] 02-03-PLAN.md — Speech pipeline: SpeechCapture class with auto-restart, fillerDetector.ts, pacing.ts (WPM + pause detection), App.tsx wired to merge visual + speech events into sorted eventLog at session end (AUD-01, AUD-02, AUD-03, AUD-04)

### Phase 3: Post-Session Review
**Goal**: Immediately after stopping a session, the user is taken to a review screen where they see their scores across all five dimensions and can watch their video back with every coaching event pinned to the exact moment it happened on a clickable timeline.
**Depends on**: Phase 2
**Requirements**: SCORE-01, SCORE-02, SCORE-03, PLAY-01, PLAY-02, PLAY-03, PLAY-04
**Success Criteria** (what must be TRUE):
  1. After stopping a session, the user sees a scorecard with a score for each of the five dimensions (eye contact, filler words, pacing, expressiveness, gestures) and a single overall score
  2. User can watch their recorded session video in a player that allows scrubbing to any point without the video freezing or showing an infinite duration
  3. The video timeline shows visible marker dots at the timestamps of coaching events; clicking a marker jumps the video to that exact moment
  4. Hovering or pausing on a timeline marker shows a description of the event (e.g., "filler word: 'um'" or "eye contact break")
  5. The scorecard data is persisted alongside the session so the same scores are visible when the session is reopened later
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Score aggregator: aggregateScores pure function + DimensionScore/ScorecardResult types + Wave 0 unit tests (SCORE-01, SCORE-02)
- [ ] 03-02-PLAN.md — ScorecardView component: 5 dimension score bars, overall score display, loading state, component tests (SCORE-01, SCORE-02)
- [ ] 03-03-PLAN.md — AnnotatedPlayer + Timeline + eventSync + complete Review.tsx rewrite with scorecard persistence; human verification checkpoint (PLAY-01, PLAY-02, PLAY-03, PLAY-04, SCORE-03)

### Phase 4: Session History
**Goal**: The user can see all their past sessions in a list and track whether they are improving over time across each coaching dimension.
**Depends on**: Phase 3
**Requirements**: HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. User can view a list of all past sessions showing date, duration, and overall score for each
  2. User can open any past session from the list and view its scorecard and annotated playback
  3. Per-dimension trend charts (sparklines or equivalent) show whether each metric is improving, stable, or worsening across the most recent sessions
**Plans**: TBD

Plans:
- [ ] 04-01: History view — HistoryView.tsx with session list (metadata only, no blob preload), per-dimension sparklines using Dexie live queries, storage quota display and delete-session flow

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Recording | 3/3 | Complete | 2026-03-12 |
| 2. Analysis Pipeline | 0/3 | Not started | - |
| 3. Post-Session Review | 3/3 | Complete   | 2026-03-15 |
| 4. Session History | 0/1 | Not started | - |
