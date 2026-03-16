# Project Research Summary

**Project:** Pitch Practice — Browser-based Presentation Coaching App
**Domain:** Client-side ML / real-time video analysis / speech analytics
**Researched:** 2026-03-16 (v2.0 analytics milestone; v1.0 research: 2026-03-12)
**Confidence:** HIGH

## Executive Summary

This is a browser-based, privacy-first presentation coaching tool that runs all ML inference client-side with zero video upload. The v1.0 system is already built and working: it captures webcam+mic via MediaStream, runs MediaPipe (FaceLandmarker, HandLandmarker, PoseLandmarker) in a classic-mode Web Worker for visual analysis, uses Web Speech API for live captions and filler detection, stores sessions as video Blobs in IndexedDB via Dexie, and renders a post-session scorecard with annotated video playback. The v2.0 milestone adds deeper speech analytics by integrating Whisper.wasm for post-session transcription and building five new analytics features on top of it.

The recommended v2.0 approach centers on a dual-transcription architecture: Web Speech API stays for live captions during recording (low latency, good enough for display), while a separate ES-module Whisper worker processes the stored audio blob after the session ends (higher accuracy, required for filler counts). All five new analytics features — accurate filler counts with per-type breakdown, pause analytics scored as a sub-dimension, WPM-over-time chart, and opening/closing strength as a new scorecard dimension — derive from Whisper word-level timestamps. This means Whisper integration is the strict gating dependency: it must be built, validated, and producing reliable output before any of the four downstream analytics features can be completed.

The primary risks are technical: (1) Chrome's Web Speech API silently suppresses filler words — Whisper is not optional for accurate filler scoring; (2) Whisper.wasm requires COOP/COEP headers for SharedArrayBuffer support, which can silently break existing CDN resources; (3) the existing classic-mode MediaPipe worker and a new ES-module Whisper worker require separate instantiation patterns that cannot be merged; and (4) Whisper and MediaPipe cannot be loaded in memory simultaneously on mid-range hardware without an explicit worker lifecycle gate. Mitigating these risks requires strict sequencing: schema migration and COOP/COEP header validation before any Whisper code is written; MediaPipe worker termination before Whisper worker startup; and `OfflineAudioContext` at 16kHz for audio extraction (not raw `decodeAudioData` at device sample rate).

---

## Key Findings

### Recommended Stack

The v1.0 stack (React 19, TypeScript 5.8, Vite 7, `@mediapipe/tasks-vision@0.10.21`, Web Speech API, MediaRecorder, Dexie 4, Zustand, Tailwind 4) is fully validated and in production. v2.0 adds two packages: `@huggingface/transformers@^3.4.x` (official Transformers.js v3, the successor to `@xenova/transformers`) for Whisper inference, and `recharts@^3.8.0` for the WPM-over-time line chart. The Whisper worker requires an ES-module worker (`{ type: 'module' }`) — incompatible with the existing classic-mode MediaPipe worker, which must remain unchanged. Vite config requires `optimizeDeps.exclude: ['@huggingface/transformers']` to prevent pre-bundling failures on WASM imports.

**Core technologies (v1.0, unchanged):**
- `React 19 + TypeScript 5.8`: Concurrent rendering keeps UI responsive during heavy WASM inference; TypeScript prevents coordinate-array type errors in MediaPipe
- `@mediapipe/tasks-vision@0.10.21`: FaceLandmarker/HandLandmarker/PoseLandmarker in one package; GPU delegate achieves 60+ FPS; CPU fallback 10-15 FPS; note npm is behind GitHub (0.10.21 vs 0.10.26)
- `Web Speech API (native)`: Zero-dependency live captions; Chrome/Edge only; kept for live UX display only, never for analytics counts
- `Dexie 4.3 (IndexedDB)`: Required for video Blob storage (localStorage caps at ~5-10 MB; sessions are 50-300 MB); `useLiveQuery` enables reactive ReviewPage updates when Whisper analysis completes asynchronously
- `Zustand 5`: Minimal-boilerplate state for recording status, active session, playback cursor

**New in v2.0:**
- `@huggingface/transformers@^3.4.x`: Official v3 Transformers.js; ONNX Runtime Web backend; use model `onnx-community/whisper-tiny.en` with `dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' }`; `device: 'wasm'` (try `webgpu` if available); must set `optimizeDeps.exclude` in vite.config.ts
- `recharts@^3.8.0`: SVG-based line chart; React 19 compatible (earlier blank-render issue was Preact-specific); minimal setup for a single WPM time-series; TypeScript types included
- `vite-plugin-coop-coep` (dev only, conditional): Add only if Whisper requires SharedArrayBuffer; production COOP/COEP headers must be set at the hosting layer separately

See `.planning/research/STACK.md` for full version compatibility table, installation commands, and alternatives considered.

### Expected Features

The v1.0 product delivered all table-stakes features: webcam+mic recording, session playback, eye contact tracking, facial expressiveness scoring, nervous gesture detection, post-session scorecard, and annotated video playback (the primary differentiator — no lightweight competitor does this). v2.0 focuses exclusively on speech analytics depth.

**Must have for v2.0 launch (table stakes at this milestone):**
- Whisper.wasm post-session transcription replacing Web Speech filler counts — Web Speech suppresses disfluencies server-side; Whisper preserves them; inaccurate filler counts undermine scorecard credibility
- Filler breakdown by type (um/uh vs. like/you know/basically) — users ask "which fillers do I use?"; single count is opaque; no competitor exposes per-type breakdown
- WPM-over-time chart (30-second windows) — Microsoft Speaker Coach already has this; users expect more than a single average WPM figure
- Pause count + average duration in the review UI — pause events already exist in the event log; users see timeline markers but have no aggregate statistics

**Should have for v2.0 (differentiators — no competitor has these):**
- Pause scored as a sub-dimension within Pacing, distinguishing mid-clause pauses (disfluent) from sentence-boundary pauses (deliberate), using ETS SpeechRater methodology (0.145s threshold, boundary vs. mid-clause classification)
- Opening/closing strength as a new dedicated scorecard dimension — scores first 30s and last 30s independently; Harvard "thin slice" research confirms outsized audience impact; zero competitors surface this explicitly
- Filler timing clusters by session segment — reveals behavioral patterns ("you use fillers most in transitions") vs. raw count alone

**Defer to after v2.0 validation:**
- WPM variance scoring component (reward deliberate variation) — validate the chart first, then add scoring
- Per-metric breakdown within opening/closing segments — combined score validates the concept first
- Multi-session trend charts for new v2.0 dimensions — wait for dimensions to stabilize across several sessions
- Filler timing cluster visualization — confirm users want "when" before "how many" before building

**Do not build (anti-features confirmed by research):**
- Real-time Whisper during recording — runs 2-5x slower than real-time in browser; would block the UI
- Content-level hook quality scoring (semantic NLP) — different complexity class entirely from delivery analytics
- Cloud sync / accounts — PROJECT.md explicit deferral; infrastructure cost before core loop validation
- AI-generated per-session coaching tips — competitors report users stop reading after 2-3 sessions; maintain quantitative data display

See `.planning/research/FEATURES.md` for full competitor analysis table, feature dependency graph, and scoring formulas.

### Architecture Approach

The existing architecture follows a single-orchestrator pattern: `App.tsx` owns all state and session lifecycle; all views and analysis components are stateless and prop-driven; analysis runs as pure functions over the in-memory event log before the Dexie write. v2.0 preserves this pattern exactly. The key structural additions are: (1) a new ES-module `whisper.worker.ts` running post-session (separate from and never coexisting in memory with the existing classic-mode `mediapipe.worker.js`); (2) a `useWhisperAnalysis` hook that fires after `db.sessions.add()` and writes Whisper results as separate top-level session fields (`whisperFillers`, `whisperStatus`, `wpmWindows`) — never mutating the existing `eventLog`; and (3) four new stateless detail panel components rendered below `AnnotatedPlayer` in `ReviewPage`.

**Major components (new or modified for v2.0):**
1. `whisper.worker.ts` (new, ES module) — receives audio ArrayBuffer via postMessage; runs `@huggingface/transformers` Whisper pipeline; returns `{ fillerCount, byType, wordTimestamps }`
2. `useWhisperAnalysis` hook (new) — fires after save; manages worker lifecycle; writes Dexie when done; exposes status via `useLiveQuery` to ReviewPage
3. `src/analysis/openingClosing.ts` (new) — pure scoring function; scores first/last 30s from existing event types; guards for sessions under 60s
4. `FillerBreakdown`, `PauseDetail`, `WPMChart`, `OpeningClosingDetail`, `WhisperStatusBanner` (5 new stateless components) — all receive data as props from ReviewPage; independently testable with fixture data
5. `scorer.ts` (modified) — adds `openingClosing` dimension; modifies `scorePacing()` to include pause penalty; accepts optional `{ fillerCount? }` override param for Whisper count; rebalances existing dimension weights
6. `db.ts` (modified) — Dexie version bump to v3; adds `whisperFillers?`, `whisperStatus?`, `wpmWindows?` as optional unindexed fields; existing sessions degrade gracefully with undefined checks in all consumers

**Key patterns to follow:**
- Augment Dexie, don't mutate eventLog: Whisper results go into separate top-level session fields; the eventLog timeline is immutable after the initial save
- Async analysis after save, reactive UI update: ReviewPage shows Web Speech scores immediately (within milliseconds); Whisper silently upgrades the filler score 10-30 seconds later; never block the view transition on Whisper
- Pure functions receive override parameters: `aggregateScores(eventLog, durationMs, { fillerCount? })` keeps scorer testable without mocking Dexie
- Strict worker lifecycle: MediaPipe worker is terminated before Whisper worker starts — never both in memory simultaneously

**Recommended build order (each step independently shippable):**
1. Dexie v3 schema + `calculateWPMWindows` — migration first, all downstream reads from Dexie
2. `scoreOpeningClosing` + ScorecardView row — pure logic, no new dependencies; top differentiator ships early
3. Pause scoring + `PauseDetail` panel — pause events already in event log; independent of Whisper
4. Filler breakdown panel (Web Speech counts) — UI shell Whisper will later upgrade; validates layout independently
5. `WPMChart` panel — reads `wpmWindows` from Step 1; purely UI
6. Whisper worker + `useWhisperAnalysis` — highest-risk item last; all earlier phases ship value with or without it

See `.planning/research/ARCHITECTURE.md` for full component inventory, modified files list, data flow diagrams, and anti-patterns.

### Critical Pitfalls

1. **Chrome Web Speech API silently suppresses filler words** — Google's cloud speech backend removes disfluencies from transcripts; "um, uh, like" arrive as nothing. Filler counts from Web Speech are unreliable and often zero. Confirm Whisper surfaces "um" and "uh" as the first validation step of the Whisper integration phase.

2. **Whisper COOP/COEP headers silently break existing CDN resources** — SharedArrayBuffer requires `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp`. Any cross-origin resource without appropriate CORS headers (CDN fonts, analytics, iframes) will stop loading. Audit all cross-origin resources, validate `window.crossOriginIsolated === true` in both dev and production before writing any Whisper code.

3. **Classic-mode MediaPipe worker and ES-module Whisper worker cannot share a file** — MediaPipe requires `importScripts` (classic); Transformers.js requires top-level `import` (module). Maintain two separate workers: existing `mediapipe.worker.js` (classic, unchanged) and new `whisper.worker.ts` (ES module, `{ type: 'module' }`).

4. **Simultaneous MediaPipe + Whisper in memory causes OOM crashes** — MediaPipe's three models consume ~300-600 MB WASM heap; Whisper adds ~100-200 MB; combined total exceeds mid-range tab limits. Explicitly terminate the MediaPipe worker before starting Whisper — never run both simultaneously.

5. **`AudioContext.decodeAudioData` outputs device sample rate (44.1/48 kHz), not Whisper's required 16 kHz** — passing the wrong-rate buffer to Whisper produces garbled or empty transcripts. Use `OfflineAudioContext(1, duration * 16000, 16000)` for resampling; verify `sampleRate === 16000` before sending to the worker.

6. **Dexie schema version bump required for every structural change** — adding new session fields without bumping the version causes `VersionError` or silent `undefined` reads on existing sessions. Bump to version 3 before any v2.0 feature code touches Dexie; include an upgrade function setting new fields to `null` on existing records.

7. **Whisper model download (~75 MB) blocks first-use UX without a loading strategy** — users assume the app is broken when it hangs silently for 30-120 seconds. Use Transformers.js (Cache API-based model caching is automatic); show a "Downloading speech model (first time only)..." progress indicator; never block session review on model download.

See `.planning/research/PITFALLS.md` for the full 14-pitfall list with warning signs and exact phase assignments.

---

## Implications for Roadmap

This is a continuation milestone on a working v1.0 product. The research confirms a clear dependency chain that dictates phase order. Five of the six phases deliver user-visible value independently; Whisper is last so it cannot block the rest of the release.

### Phase 1: Schema Migration + WPM Windows Foundation
**Rationale:** All v2.0 features read from Dexie. The schema migration must exist and be validated on existing sessions before any feature code runs. `calculateWPMWindows` is a pure function with no external dependencies — cheapest to get right before UI builds on it. No user-visible output; this is the prerequisite gate for everything else.
**Delivers:** Dexie v3 schema with `whisperFillers?`, `whisperStatus?`, `wpmWindows?`; `calculateWPMWindows()` pure function; verified backward compatibility with existing v1.0 sessions
**Avoids:** Pitfall 8 (silent DB corruption from missing version bump); Pitfall 9 (event queue backpressure — write wpmWindows once at session end, not incrementally during recording)
**Research flag:** Standard patterns — Dexie versioning is well-documented; no deeper research needed

### Phase 2: Opening/Closing Scorer + Scorecard Row
**Rationale:** Pure analysis logic with zero new dependencies — works entirely from the existing event log. Delivers the top-differentiator feature (no competitor has this) immediately and validates the scoring formula before Whisper provides cleaner input data. No worker, no Dexie changes, no new chart library.
**Delivers:** `scoreOpeningClosing()` in `src/analysis/openingClosing.ts`; `openingClosing` dimension row in ScorecardView; edge-case handling for sessions under 60 seconds
**Avoids:** Weight rebalancing regression in existing scorer dimensions (adjust WEIGHTS constant carefully)
**Research flag:** Standard patterns — scoring formula documented in FEATURES.md; pure function, well-understood

### Phase 3: Pause Scoring + PauseDetail Panel
**Rationale:** Pause events already exist in the event log from v1.0 (`detectPauses` already runs; `scorePacing()` ignores them). Scoring them and building a detail panel requires only modifying one existing function and one new stateless component. No Whisper dependency.
**Delivers:** `scorePauses()` sub-function inside `scorePacing()`; `PauseDetail` component (count, avg duration, longest pause); pacing sub-dimension visible in the scorecard
**Avoids:** Scoring boundary pauses the same as mid-clause pauses (use ETS SpeechRater methodology: penalize mid-clause pauses, reward sentence-boundary pauses)
**Research flag:** Standard patterns — ETS SpeechRater methodology documented in FEATURES.md; formula ready to implement

### Phase 4: Filler Breakdown Panel (Web Speech Baseline)
**Rationale:** Filler events in the event log already carry `.label` (specific word string). Building `FillerBreakdown` and `groupFillersByType()` now creates the UI shell that Whisper will later upgrade with more accurate counts. Validates layout and grouping logic independently before Whisper is integrated.
**Delivers:** `groupFillersByType()` pure function; `FillerBreakdown` component showing per-type counts and session-thirds clustering; stateless, Whisper-upgradeable via `whisperFillers?` prop
**Research flag:** Standard patterns — string pattern matching on existing event labels; no new dependencies

### Phase 5: WPM Chart Panel
**Rationale:** `wpmWindows` data is already being written to Dexie (Phase 1). This phase is purely UI: read stored windows, render a line chart. recharts is the only new dependency.
**Delivers:** `WPMChart` component with recharts `LineChart + ResponsiveContainer`; graceful "no data" state for old sessions lacking `wpmWindows`
**Avoids:** Using recharts below 3.8.0 (blank-render issue with earlier versions)
**Research flag:** Standard patterns — recharts LineChart is well-documented; minimal setup for a single time-series

### Phase 6: Whisper Integration (Worker + Hook + Banner)
**Rationale:** Highest technical risk, most external dependencies. Everything in Phases 1-5 provides value independently even if Whisper is delayed or descoped. Whisper must come last so that environment-specific blockers (COOP/COEP header conflicts, hosting provider constraints) cannot hold up the rest of the release.
**Delivers:** `whisper.worker.ts` (ES module, `@huggingface/transformers`, `onnx-community/whisper-tiny.en` at q8); `useWhisperAnalysis` hook; `WhisperStatusBanner`; filler score upgraded from Web Speech count to Whisper count; `FillerBreakdown` upgraded to use `whisperFillers.byType` when available
**Avoids:** Pitfall 1 (Web Speech suppresses fillers); Pitfall 2 (COOP/COEP header conflicts — audit first before writing code); Pitfall 3 (worker type incompatibility — two separate workers); Pitfall 4 (wrong audio sample rate — use OfflineAudioContext at 16kHz); Pitfall 5 (missing audio track — validate before sending to worker); Pitfall 6 (first-use download UX — rely on Transformers.js Cache API caching); Pitfall 7 (OOM from dual WASM heaps — terminate MediaPipe before starting Whisper); Pitfall 11 (Firefox 256 MB limit — whisper-tiny is 75 MB, well under the limit)
**Research flag:** NEEDS RESEARCH — Validate COOP/COEP header interactions with the production hosting environment before committing to an implementation approach. Confirm `window.crossOriginIsolated === true` is achievable in production (not just Vite dev server). Prototype the two-worker instantiation pattern in isolation before wiring to the full app.

### Phase Ordering Rationale

- Schema migration is unconditionally first — any feature that reads new Dexie fields silently returns `undefined` on existing sessions without the version bump; this cannot be backfilled
- Phases 2-5 are ordered by decreasing Whisper dependency — each delivers shippable, testable value with no dependence on Whisper being complete
- Opening/Closing comes before Filler Breakdown because it is the highest-value differentiator and has zero new dependencies — it ships early to validate the scoring formula
- Whisper is last because it carries two confirmed blocking pitfalls (COOP/COEP and worker type incompatibility) that require environment-specific validation before the implementation path is known; no other phase has this uncertainty profile

### Research Flags

Phases requiring deeper research during planning:
- **Phase 6 (Whisper Integration):** COOP/COEP header behavior on the production hosting environment is unknown; the two-worker constraint creates Vite config implications that need a spike/prototype to validate before the full implementation is planned; recommend a focused research session on hosting-layer header configuration and a small worker-isolation proof-of-concept

Phases with standard patterns (skip research-phase):
- **Phase 1:** Dexie versioning patterns are well-documented; window-bucketing is a straightforward algorithm
- **Phase 2:** Scoring formula sourced from FEATURES.md; pure function with no I/O
- **Phase 3:** ETS SpeechRater methodology fully documented; pause events already in event log
- **Phase 4:** String pattern matching on existing data; no new infrastructure
- **Phase 5:** recharts documentation is comprehensive; data already written in Phase 1

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | v1.0 stack in production; v2.0 additions verified via official docs and npm; version numbers cross-checked against GitHub and npm registry |
| Features | HIGH (v1.0) / MEDIUM (v2.0) | v1.0 features validated in production; v2.0 analytics methodology sourced from ETS SpeechRater, Gao et al. 2025, and competitor analysis; scoring formulas are researcher-recommended starting points, not yet empirically tuned |
| Architecture | HIGH | v1.0 source code is the source of truth; v2.0 integration analysis reads actual source files; data flow analysis is exact |
| Pitfalls | HIGH | 14 pitfalls documented with warning signs and phase assignments; critical pitfalls confirmed via GitHub issues and official browser API documentation; v1.0 pitfalls production-verified |

**Overall confidence:** HIGH

### Gaps to Address

- **Whisper scoring thresholds need empirical calibration:** The filler scoring thresholds and pause penalty weights are researcher-recommended starting points. Expect to adjust curves after testing with real user sessions.
- **Opening/closing dimension weight within the overall scorecard is unspecified:** The new dimension must be incorporated without undermining the existing filler/pacing/eyeContact/expressiveness/gesture weights. The exact rebalancing is not yet specified and needs a deliberate decision.
- **COOP/COEP in production hosting environment:** Which hosting provider is used determines how headers are deployed. This is not a code problem but an ops prerequisite — confirm early in Phase 6 planning before any Whisper code is written.
- **Whisper punctuation reliability for pause boundary classification:** Pause analytics assumes Whisper-tiny produces reliable punctuation for sentence boundary detection. This holds for clean English speech but needs validation on real recorded sessions before the pause scoring formula is tuned.

---

## Sources

### Primary (HIGH confidence)
- Source code: `src/App.tsx`, `src/analysis/scorer.ts`, `src/db/db.ts`, `src/analysis/pacing.ts`, `src/pages/Review.tsx`, `src/components/ScorecardView/ScorecardView.tsx`, `src/hooks/useMLWorker.ts` — first-party source of truth for architecture
- `.planning/STATE.md` — confirmed Web Speech filler under-counting, classic-mode worker constraint
- `.planning/PROJECT.md` — v2.0 feature requirements
- `https://www.npmjs.com/package/@mediapipe/tasks-vision` — version 0.10.21; npm-vs-GitHub lag confirmed
- `https://github.com/google-ai-edge/mediapipe/issues/6098` — npm lag to 0.10.21 confirmed
- `https://dexie.org` — Dexie 4.3.0; React hooks; versioning docs
- `https://react.dev/blog/2025/10/01/react-19-2` — React 19.2.4 current
- `https://vite.dev/releases` — Vite 7.3.1; Node 20.19+ requirement
- `https://huggingface.co/blog/transformersjs-v3` — Transformers.js v3; WebGPU; per-module dtype confirmed
- `https://huggingface.co/blog/transformersjs-v4` — v4 is `next` tag / preview only as of March 2026
- `https://huggingface.co/docs/transformers.js/tutorials/react` — official React + Vite worker setup; optimizeDeps.exclude config
- `https://github.com/huggingface/transformers.js/issues/1291` — @xenova to @huggingface package migration confirmed
- `https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API` — Chrome/Edge-only support
- `https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData` — universal browser support confirmed
- `https://www.npmjs.com/package/recharts` — version 3.8.0, March 2026

### Secondary (MEDIUM confidence)
- `https://ai.myspeakingscore.com/distribution-of-pauses/` — ETS SpeechRater methodology (0.145s threshold; mid-clause vs. boundary pause classification)
- `https://pmc.ncbi.nlm.nih.gov/articles/PMC11119743/` — silent pause threshold methodology 2024
- `https://journals.sagepub.com/doi/10.1177/02655322251315792` — Gao et al. 2025; optimal pause thresholds for L2 fluency
- `https://support.microsoft.com/en-us/office/suggestions-from-speaker-coach` — Speaker Coach WPM variance chart confirmed
- `https://virtualspeech.com/blog/average-speaking-rate-words-per-minute` — 100-165 WPM target range
- `https://www.toastmasters.org/magazine/magazine-issues/2025/november/how-to-hook-audiences-from-the-start` — opening strength coaching guidance
- `https://github.com/recharts/recharts/issues/6857` — blank-render confirmed Preact-specific, not React 19
- Multiple sources on React vs. Svelte concurrent rendering under heavy compute — React advantage corroborated
- MediaPipe WASM GPU delegate FPS benchmarks — 60+ FPS GPU; 10-15 FPS CPU-only (corroborated across multiple sources)

### Tertiary (LOW confidence)
- `https://rxdb.info/articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.html` — OPFS vs. IndexedDB performance (third-party benchmarks; not independently verified)
- Firefox 256 MB WASM model size limit — documented in whisper.cpp project discussion boards; not in Firefox official release notes
- Whisper ONNX model sizes (~70 MB q8 for tiny) — aggregated from ggml.ai, openwhispr.com, and Hugging Face model cards; actual sizes should be verified against HuggingFace Hub at integration time

---

*Research completed: 2026-03-16*
*Ready for roadmap: yes*
