# Roadmap: Presentation Coach

## Overview

Build a fully client-side browser tool that records a user practicing a talk, runs five ML-driven analysis dimensions in the browser, and delivers annotated video playback with timestamped coaching events and a scorecard. The path: establish a verified technical foundation (recording + architecture spikes), wire all analysis pipelines, surface post-session review (annotated playback + scorecard), then close the loop with session history and progress tracking.

v2.0 deepens speech analytics by integrating Whisper.wasm for accurate filler counts and adding five new analytics features: opening/closing strength, pause scoring, filler breakdown by type, WPM-over-time chart, and Whisper-powered filler accuracy.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

**v1.0 — Core Product**

- [x] **Phase 1: Foundation and Recording** - Verified project scaffold, architecture spikes for the three HIGH-recovery-cost pitfalls, and a working recording pipeline that produces seekable WebM blobs persisted to IndexedDB
- [ ] **Phase 2: Analysis Pipeline** - All five analysis signals (eye contact, expressiveness, nervous gestures, filler words, pacing) running in the browser via a throttled ML Worker and Web Speech API, producing a complete timestamped event log for every session
- [x] **Phase 3: Post-Session Review** - Scorecard with per-dimension and overall scores, plus annotated video playback with a clickable event timeline — the product's core differentiator (completed 2026-03-15)
- [x] **Phase 4: Session History** - Persistent session list, per-dimension trend charts, and storage quota management that makes improvement over time visible and safe (completed 2026-03-16)
- [x] **Phase 5: UI Polish** - Fix all 12 audit findings and elevate visual design quality across the full app
- [x] **Phase 6: Interactive UX Improvements** - Custom tooltips, smarter filler detection, and live captions during playback
- [x] **Phase 7: Visual Redesign** - Distinctive premium visual identity across all screens

**v2.0 — Deeper Analytics**

- [ ] **Phase 8: Schema Migration + WPM Windows** - Dexie v3 schema with new analytics fields and WPM windowing function — prerequisite gate for all v2.0 features
- [ ] **Phase 9: Opening/Closing Strength** - New scorecard dimension scoring first and last 30s of each session from the existing event log
- [ ] **Phase 10: Pause Scoring + Detail Panel** - Pause quality scoring as a Pacing sub-dimension with a PauseDetail panel showing count and duration breakdown
- [ ] **Phase 11: Filler Breakdown Panel** - Per-type filler counts and session-thirds clustering in review UI, built on Web Speech baseline and upgradeable by Whisper
- [ ] **Phase 12: WPM Chart Panel** - Speaking rate over time as a 30-second-window line chart in review UI
- [ ] **Phase 13: Whisper Integration** - Whisper.wasm post-session transcription replacing Web Speech filler counts, with status banner and graceful fallback

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
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — HistoryView page: session list with metadata (no blob preload), delete flow with confirmation modal, storage quota bar
- [ ] 04-02-PLAN.md — SparklineChart component with computeTrendDirection pure function (inline SVG, no charting library)
- [ ] 04-03-PLAN.md — App.tsx state machine wiring: 'history' view, historySessionId state, onBack for ReviewPage, onViewHistory for SetupScreen, sparkline section in HistoryView

### Phase 5: UI Polish — fix all audit findings and elevate visual design quality across the full app

**Goal:** Fix all 12 audit findings (A-01 through A-12) from the UI audit reviews, establishing a consistent color hierarchy, WCAG-compliant touch targets, unified typography scale, and polished interaction affordances across all screens.
**Requirements**: A-01, A-02, A-03, A-04, A-05, A-06, A-07, A-08, A-09, A-10, A-11, A-12
**Depends on:** Phase 4
**Plans:** 5/5 plans complete

Plans:
- [ ] 05-01-PLAN.md — Wave 0: Create 3 missing test files (SessionListItem.test.tsx, StorageQuotaBar.test.tsx, Home.test.tsx) for Nyquist compliance
- [ ] 05-02-PLAN.md — Color system: A-01 score bar three-tier colors (ScorecardView), A-03 delete button always-visible + aria-label, A-07 score badge color coding (SessionListItem), A-08 sparkline opacity 0.9, A-01 StorageQuotaBar critical fill bg-red-500
- [ ] 05-03-PLAN.md — Accessibility: A-02 Timeline touch targets (h-11 container, w-4 h-4 dots, 44px tap area, 8px offset)
- [ ] 05-04-PLAN.md — Typography + layout: A-04 unified h1 across all 4 pages (text-xl font-semibold), A-06 View History affordance (arrow + no underline + padding), A-11 max-w-3xl on all page containers, A-12 footnote text-gray-500
- [ ] 05-05-PLAN.md — Affordances + copy: A-05 processing spinner, A-09 play/pause overlay, A-10 modal cleanup, full copywriting sweep (StorageQuotaBar, SparklineChart, NameSessionModal, SpeechSupportBanner, Review)

### Phase 6: interactive-ux-improvements: fix timeline tooltips with custom hover component, expand filler word detection with context-aware logic, add live caption display during session review playback

**Goal:** Replace native browser title tooltips with a custom React tooltip component, expand filler word detection from 4 to 13+ patterns with context-aware "like" suppression, and add a toggleable live caption bar below the video player synced to playback time.
**Requirements**: PLAY-04, AUD-02, REC-05
**Depends on:** Phase 5
**Plans:** 3/3 plans executed

Plans:
- [ ] 06-01-PLAN.md — Custom tooltip in Timeline.tsx: remove title attr, add tooltipIndex state, render absolutely-positioned div above hovered marker with clamp() edge clamping
- [ ] 06-02-PLAN.md — Expanded filler detection: FILLER_PATTERNS expanded to 13 patterns, LINKING_VERBS set, isLikeAFiller() context-check, TDD with failing tests first
- [ ] 06-03-PLAN.md — Caption system: Dexie v2 schema migration (transcript field), App.tsx transcript persistence, AnnotatedPlayer caption bar + CC toggle, Review.tsx prop wire

### Phase 7: visual-redesign: elevate the overall frontend design quality with a more impressive, polished, and distinctive visual identity across all screens

**Goal:** Replace the flat gray-950 + red-600 aesthetic with a distinctive, premium coaching-tool identity: deep blue-slate base (#080c14), single indigo accent (#6366f1), Inter 400/600 typography, layered depth via subtle borders and glows, and data visualizations (scorecard ring, sparklines, storage bar) treated as first-class design elements.
**Requirements**: UI-FOUND-01, UI-HOME-01, UI-SETUP-01, UI-REC-01, UI-APP-01, UI-SCORE-01, UI-PLAYER-01, UI-REVIEW-01, UI-HISTORY-01, UI-MODAL-01, UI-BANNER-01
**Depends on:** Phase 6
**Plans:** 7/7 plans complete

Plans:
- [ ] 07-01-PLAN.md — CSS foundation: Inter font in index.html, CSS custom properties + body base rule in index.css
- [ ] 07-02-PLAN.md — Home + SetupScreen: "Pitch Practice" wordmark with indigo underline, indigo CTA with hover glow, feature list accent bars, dark surface camera preview
- [ ] 07-03-PLAN.md — RecordingScreen + App.tsx: black bg, display-size tabular-nums timer, red-500 stop button, indigo processing spinner
- [ ] 07-04-PLAN.md — ScorecardView: SVG score ring (120px, indigo stroke, glow), animated dimension bars (0% to score% on mount, 300ms)
- [ ] 07-05-PLAN.md — AnnotatedPlayer + Timeline + Review.tsx: 8px timeline track, category-colored markers, indigo CC toggle, indigo CTA
- [ ] 07-06-PLAN.md — HistoryView + SessionListItem + SparklineChart + StorageQuotaBar: "Past Sessions" header, card hover states, inline-style score badge, indigo sparkline, 6px storage bar
- [ ] 07-07-PLAN.md — Modals + SpeechSupportBanner: NameSessionModal indigo CTA + skip link, DeleteConfirmModal spec copy, SpeechSupportBanner amber redesign with dismiss button

### Phase 8: Schema Migration + WPM Windows
**Goal**: The Dexie schema is migrated to v3 with all new analytics fields in place and WPM windowing data is calculated and stored at session end, so every downstream v2.0 feature reads from a consistent, versioned schema without silent undefined failures.
**Depends on**: Phase 7
**Requirements**: FOUND-01, FOUND-02
**Success Criteria** (what must be TRUE):
  1. After recording a new session, `db.sessions.get(id)` returns a record with `wpmWindows` as an array of 30-second window objects (not undefined)
  2. Existing v1.0 sessions in IndexedDB are either cleared or degrade gracefully — no VersionError is thrown on app load after the migration
  3. The `whisperFillers` and `whisperStatus` fields exist on session records as optional fields (undefined on new sessions until Whisper runs in Phase 13)
  4. `calculateWPMWindows()` is a pure function with unit tests passing — given a transcript with timestamps, it returns correctly bucketed 30-second windows
**Plans**: 2 plans

Plans:
- [ ] 08-01-PLAN.md — Dexie v3 schema migration: WPMWindow + WhisperFillerResult types, Session interface extension, version(3) with upgrade clear
- [ ] 08-02-PLAN.md — calculateWPMWindows() pure function with TDD tests, wired into App.tsx handleSaveName

### Phase 9: Opening/Closing Strength
**Goal**: The user sees a new Opening/Closing scorecard dimension after every session, scored from the first and last 30 seconds of the existing event log, so they get actionable feedback on the two moments that carry the most audience impact.
**Depends on**: Phase 8
**Requirements**: ANAL-01
**Success Criteria** (what must be TRUE):
  1. The post-session scorecard shows an "Opening/Closing" dimension row alongside the existing five dimensions, with a numeric score
  2. The score reflects event density and quality in the first 30s and last 30s independently — a strong opening with a weak closing produces a different score than the reverse
  3. For sessions shorter than 60 seconds, the dimension either shows a clear "session too short" state or handles the edge case without crashing
  4. `scoreOpeningClosing()` is a pure function with unit tests covering the short-session edge case and at least two different scoring scenarios
**Plans**: TBD

### Phase 10: Pause Scoring + PauseDetail Panel
**Goal**: The pacing score reflects pause quality (not just pause count), and the user sees a PauseDetail panel on the review page showing pause count and average duration, so they can distinguish hesitation pauses from deliberate emphasis pauses.
**Depends on**: Phase 8
**Requirements**: ANAL-02, ANAL-03
**Success Criteria** (what must be TRUE):
  1. The review page shows a PauseDetail panel with total pause count, average pause duration, and longest pause duration for the session
  2. The pacing scorecard dimension score changes when a session has many mid-clause pauses versus the same pause count at sentence boundaries — pause quality affects the score, not just frequency
  3. A session with zero pause events shows a graceful "no significant pauses detected" state in the PauseDetail panel, not a blank or error state
  4. `scorePauses()` is a pure function with unit tests covering mid-clause versus sentence-boundary classification using the ETS SpeechRater 0.145s threshold
**Plans**: TBD

### Phase 11: Filler Breakdown Panel
**Goal**: The user sees which filler words they use most often and in which part of their talk, so they can target specific habits rather than treating all fillers as one undifferentiated problem.
**Depends on**: Phase 8
**Requirements**: ANAL-04, ANAL-05
**Success Criteria** (what must be TRUE):
  1. The review page shows a FillerBreakdown panel with per-type counts (um, uh, like, you know, etc.) derived from the event log filler labels
  2. The panel shows which session third (opening, middle, closing) had the highest filler density, so the user knows when in their talk the habit peaks
  3. When Whisper data is available (Phase 13), the panel automatically uses `whisperFillers.byType` for counts instead of Web Speech event counts — the component is Whisper-upgradeable via props
  4. A session with zero filler events shows a graceful empty state, not a blank or error state
**Plans**: TBD

### Phase 12: WPM Chart Panel
**Goal**: The user sees their speaking rate as a line chart over time (30-second windows) in the review page, so they can identify where they rushed or slowed down rather than seeing only a single average WPM figure.
**Depends on**: Phase 8
**Requirements**: ANAL-06
**Success Criteria** (what must be TRUE):
  1. The review page shows a WPM line chart with one data point per 30-second window, rendered using recharts
  2. The chart x-axis labels correspond to session time segments (e.g., "0:00", "0:30", "1:00") and the y-axis shows words per minute
  3. A session recorded before Phase 8 (no `wpmWindows` in storage) shows a graceful "no data available" state, not a crash or blank chart
  4. The chart renders correctly for sessions as short as one window (30–60 seconds) and as long as 20+ minutes
**Plans**: TBD

### Phase 13: Whisper Integration
**Goal**: Post-session audio is re-analyzed by Whisper.wasm so filler counts are accurate (Web Speech suppresses disfluencies), and the user sees transparent progress while this happens, with a graceful fallback to Web Speech counts if Whisper fails.
**Depends on**: Phase 11
**Requirements**: WHIS-01, WHIS-02, WHIS-03, WHIS-04, WHIS-05
**Success Criteria** (what must be TRUE):
  1. After a session ends, the filler score on the scorecard is updated within 10–30 seconds to reflect Whisper-derived counts — the review page shows Web Speech scores immediately and the score upgrades silently when Whisper finishes
  2. A WhisperStatusBanner is visible on the review page while Whisper analysis is running, and disappears or updates to a success state when complete
  3. When Whisper is downloaded for the first time (~75 MB), the user sees a progress indicator reading "Downloading speech model (first time only)..." — the app does not appear frozen
  4. Live captions during recording are unaffected — Web Speech API continues to power real-time captions exactly as before
  5. If Whisper fails (network error, unsupported browser, WASM error), the scorecard retains the Web Speech-derived filler counts and no error state is shown to the user beyond the banner updating
**Plans**: TBD

## Progress

**Execution Order:**
v1.0 phases: 1 → 2 → 3 → 4 → 5 → 6 → 7
v2.0 phases: 8 → 9 → 10 → 11 → 12 → 13

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Recording | 3/3 | Complete | 2026-03-12 |
| 2. Analysis Pipeline | 0/3 | Not started | - |
| 3. Post-Session Review | 3/3 | Complete | 2026-03-15 |
| 4. Session History | 3/3 | Complete | 2026-03-16 |
| 5. UI Polish | 5/5 | Complete | - |
| 6. Interactive UX Improvements | 3/3 | Complete | - |
| 7. Visual Redesign | 7/7 | Complete | - |
| 8. Schema Migration + WPM Windows | 0/2 | Not started | - |
| 9. Opening/Closing Strength | 0/TBD | Not started | - |
| 10. Pause Scoring + PauseDetail Panel | 0/TBD | Not started | - |
| 11. Filler Breakdown Panel | 0/TBD | Not started | - |
| 12. WPM Chart Panel | 0/TBD | Not started | - |
| 13. Whisper Integration | 0/TBD | Not started | - |
