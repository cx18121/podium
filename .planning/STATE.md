---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: v2.0 roadmap created — 6 phases (8-13), 13 requirements mapped
stopped_at: Completed 08-01-PLAN.md — Dexie v3 schema migration
last_updated: "2026-03-16T19:41:34.269Z"
last_activity: 2026-03-16 — v2.0 roadmap created (phases 8-13)
progress:
  total_phases: 13
  completed_phases: 7
  total_plans: 29
  completed_plans: 28
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-16)

**Core value:** You watch your own session back with a coach's eye: every filler word, eye contact break, and nervous gesture marked at the exact moment it happened.
**Current focus:** Phase 8 — Schema Migration + WPM Windows (v2.0 prerequisite gate)

## Current Position

Phase: Not started (roadmap defined, ready for plan-phase 8)
Plan: —
Status: v2.0 roadmap created — 6 phases (8-13), 13 requirements mapped
Last activity: 2026-03-16 — v2.0 roadmap created (phases 8-13)

Progress: [░░░░░░░░░░] 0% (v2.0 milestone)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~10 min
- Total execution time: ~0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation-and-recording | 3 | ~30min | ~10min |

**Recent Trend:**
- Last 5 plans: 01-01 (11min), 01-02 (~9min), 01-03 (~10min)
- Trend: consistent ~10 min/plan

*Updated after each plan completion*
| Phase 02-analysis-pipeline P01 | 11 | 3 tasks | 11 files |
| Phase 02-analysis-pipeline P02 | 8 | 3 tasks | 7 files |
| Phase 02-analysis-pipeline P03 | 18 | 2 tasks | 7 files |
| Phase 03-post-session-review P01 | 24 | 2 tasks | 3 files |
| Phase 03-post-session-review P02 | 20 | 1 tasks | 2 files |
| Phase 03-post-session-review P03 | 28 | 3 tasks | 7 files |
| Phase 04-session-history P01 | 10 | 2 tasks | 6 files |
| Phase 04-session-history P02 | 3 | 1 tasks | 2 files |
| Phase 04-session-history P03 | 15 | 3 tasks | 4 files |
| Phase 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app P01 | 5 | 3 tasks | 3 files |
| Phase 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app P02 | 20 | 2 tasks | 4 files |
| Phase 05 P03 | 7 | 1 tasks | 2 files |
| Phase 05-ui-polish-fix-all-audit-findings-and-elevate-visual-design-quality-across-the-full-app P04 | 9 | 2 tasks | 4 files |
| Phase 05 P05 | 8 | 2 tasks | 9 files |
| Phase 06-interactive-ux-improvements P02 | 7 | 2 tasks | 2 files |
| Phase 07-visual-redesign P01 | 5 | 2 tasks | 2 files |
| Phase 07-visual-redesign P02 | 12 | 2 tasks | 3 files |
| Phase 07-visual-redesign P03 | 15 | 2 tasks | 3 files |
| Phase 07-visual-redesign P05 | 10 | 2 tasks | 3 files |
| Phase 07-visual-redesign P06 | 525971 | 1 tasks | 6 files |
| Phase 07-visual-redesign P07 | 13 | 2 tasks | 5 files |
| Phase 07-visual-redesign P04 | 15 | 2 tasks | 2 files |
| Phase 08-schema-migration-wpm-windows P01 | 7 | 1 tasks | 2 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- All three MediaPipe pitfalls (worker loading, filler suppression, WebM seek) front-loaded into Phase 1 spikes — HIGH recovery cost if discovered late.
- Score schema locked at end of Phase 3 — schema changes after v1 make historical data incomparable.
- [01-01] Tailwind v4 with @tailwindcss/vite plugin: no tailwind.config.js or postcss.config.js
- [01-01] Dexie schema v1 indexes only ++id, createdAt, title — videoBlob never indexed
- [01-01] vitest types via `/// <reference types="vitest" />` + `types: ["vitest/config"]` in tsconfig.node.json
- [Phase 01-02]: MediaPipe CONFIRMED: classic-mode Web Worker with importScripts works on Chrome — proceed with this in 02-01
- [Phase 01-02]: webmFixDuration CONFIRMED: fixes Infinity WebM duration to finite seekable value — use in 01-03 recording pipeline
- [Phase 01-02]: Filler detection CONSTRAINT: Web Speech API partially suppresses um/uh — scoring must account for under-counting; do not rely solely on Web Speech
- [Phase 01-03]: webmFixDuration applied before every IndexedDB write — without it, video duration is Infinity and seeking is broken
- [Phase 01-03]: NameSessionModal is optional — skipping uses auto date/time name ("March 12, 2026 — 3:41 PM" format)
- [Phase 01-03]: App.tsx owns all recording state — screens are stateless, simplifying future phase additions
- [Phase 02-01]: Worker tests (VIS-01) remain as it.todo stubs — classic-mode worker cannot run in jsdom; manual gate in 02-VALIDATION.md
- [Phase 02-01]: Hidden video element created from stream for frame pump but never appended to DOM (RESEARCH.md Pitfall 7)
- [Phase 02-analysis-pipeline]: Analysis functions inlined as plain JS in worker — classic-mode Web Worker cannot use ES module imports
- [Phase 02-analysis-pipeline]: Analysis state (eyeContactState, prevShoulderX, prevFaceTouching, expressionFrameScores) owned by worker module level — keeps pure functions testable in isolation
- [Phase 02-analysis-pipeline]: GAZE_THRESHOLD=0.15, FACE_TOUCH_THRESHOLD=0.12, SWAY_THRESHOLD=0.04 shipped as uncalibrated heuristics — tune after Phase 3 first recordings
- [Phase 02-03]: wpm_snapshot event at durationMs position so Phase 3 scorer can find it at the end of eventLog without scanning
- [Phase 02-03]: SpeechCapture as plain class held in useRef — transcript accumulation does not need React re-renders
- [Phase 03-post-session-review]: aggregateScores returns ScorecardResult with DimensionScore objects; only .score persisted to Dexie
- [Phase 03-post-session-review]: vitest pool changed to vmThreads in vite.config.ts — forks pool times out in WSL2
- [Phase 03-post-session-review]: [03-01] WEIGHTS: eyeContact=0.25, fillers=0.25, pacing=0.20, expressiveness=0.15, gestures=0.15 — first-pass, needs calibration after recordings
- [Phase 03-post-session-review]: ScorecardView is fully stateless — scorecard prop is ScorecardResult | null, null triggers loading state
- [Phase Phase 03-03]: currentTimeMs in React state (not ref) to enable Timeline re-renders for nearest-marker highlight
- [Phase Phase 03-03]: Defensive new Date(createdAt) wrap for Dexie date fields in fake-indexeddb test environment
- [Phase 03-post-session-review]: z-10 added to marker buttons so they paint above the progress fill overlay and reliably receive hover/pointer events for native title tooltip display
- [Phase 04-01]: deleteTargetId: number | null state controls DeleteConfirmModal — null = closed, non-null = open with target id
- [Phase 04-01]: StorageQuotaBar returns null when navigator.storage.estimate unavailable — no error state shown
- [Phase 04-01]: videoBlob never accessed in HistoryView or SessionListItem — lazy-load-only contract enforced
- [Phase 04-session-history]: SparklineChart optional trend prop: caller computes direction via computeTrendDirection and passes it in
- [Phase 04-session-history]: TrendDirection exported as type alongside SparklineChart component for consumer type safety
- [Phase 04-session-history]: historySessionId: number | null distinguishes history-opened ReviewPage from post-recording — both flows share ReviewPage via savedSessionId ?? historySessionId
- [Phase 04-session-history]: onBack prop undefined in post-recording flow — ReviewPage renders Back to History only when prop is defined, no boolean flag needed
- [Phase 04-session-history]: Sparklines cap at 10 sessions (sessions.slice(0,10).reverse()) for meaningful trend without over-weighting old data
- [Phase 05]: Wave 0 stubs: tests written against future fixed behavior, current failures are intentional and confirm tests are meaningful
- [Phase 05]: StorageQuotaBar tests use Object.defineProperty on navigator.storage with configurable:true for reset between tests
- [Phase 05-02]: [05-02] scoreBarColor: emerald-500 >= 70, amber-400 for 40-69, red-500 < 40 — red-606 reserved for CTA buttons only
- [Phase 05-02]: [05-02] Delete button always visible (removed opacity-0/group-hover) — improves keyboard accessibility
- [Phase 05-03]: [05-03] Tap area expansion via -mx-[14px] -my-[14px] px-[14px] py-[14px]: dot 16px + 14px + 14px = 44px per axis, negative margin prevents visual shift
- [Phase 05-04]: [05-04] All four page h1 elements normalized to text-xl font-semibold — eliminates four-different-sizes inconsistency
- [Phase 05-04]: [05-04] max-w-3xl applied consistently to all page outer containers including SetupScreen for visual consistency per A-11
- [Phase 05-04]: [05-04] View History button: removed underline, added arrow prefix and px-4 py-2 for 44px touch target compliance (A-06)
- [Phase 05-05]: [05-05] onClick removed from video, placed on overlay button only — prevents double-toggle
- [Phase 05-05]: [05-05] isPlaying state driven by onPlay/onPause events — authoritative video state
- [Phase 05-05]: [05-05] Processing spinner inlined in App.tsx — no ProcessingSpinner component per RESEARCH.md Pitfall 6
- [Phase 06-01]: Custom tooltip via useState<number | null> index; pointer-events-none on tooltip prevents onMouseLeave on button; clamp() for viewport-safe positioning
- [Phase 06-01]: Tests updated from getByTitle to getByRole('button', {name}) — semantically correct, tests accessible API rather than removed title attr
- [Phase 06-02]: [06-02] SO_OBJECT_VERBS suppression: so after think/know/do = not a filler — preserves existing test and aligns with natural speech
- [Phase 06-02]: [06-02] normalizeLabel() scoped to um+/uh+ only — general repeated-char collapse was corrupting actually/basically labels
- [Phase 06-02]: [06-02] Pronoun I excluded from proper-noun suppression in isLikeAFiller — like I was saying is a valid filler
- [Phase 06-03]: Dexie v2 stores() string identical to v1 — transcript is unindexed data; version block required for Dexie upgrade machinery
- [Phase 06-03]: getCurrentCaption pure function filters isFinal segments by timestampMs <= currentTimeMs and returns last match via .at(-1)
- [Phase 06-03]: showCaptions defaults false — CC button must be explicitly clicked; min-h-[2.5rem] on caption bar prevents layout collapse
- [Phase 07-01]: @layer base used for :root color tokens — keeps Tailwind cascade integration correct
- [Phase 07-01]: Inter loaded from Google Fonts CDN (not self-hosted) — loads only 400+600 weights
- [Phase 07-02]: [07-02] Home/SetupScreen redesigned: indigo wordmark, accent bars, dark preview card — footnote test updated from text-gray-500 to text-[#475569]
- [Phase 07-03]: [07-03] RecordingScreen pure black bg (#000) intentionally darker than #080c14 — distraction-free blackout; red-500 stop button is correct for danger signal; indigo spinner for loading states
- [Phase 07-05]: [07-05] markerBg uses inline style backgroundColor not dynamic Tailwind class — Tailwind v4 JIT cannot generate from variable strings
- [Phase 07-05]: [07-05] 8px visual timeline track inside 48px transparent click wrapper — preserves Phase 05-03 44px tap target while visually slimming the track
- [Phase 07-05]: [07-05] Category color scheme: amber=#fbbf24 filler, indigo=#818cf8 eye-contact, red=#f87171 gesture, slate=#94a3b8 pause
- [Phase 07-visual-redesign]: [07-06] scoreBadgeStyle uses inline CSSProperties with rgba at 15% opacity — avoids Tailwind JIT dynamic class purging
- [Phase 07-visual-redesign]: [07-06] StorageQuotaBar placed inline in list header row alongside Start Recording button — no standalone position
- [Phase 07-visual-redesign]: [07-06] Amber warning message removed from StorageQuotaBar per spec — only critical state shows extra copy
- [Phase 07-07]: [07-07] NameSessionModal description paragraph removed — spec shows minimal layout (title + input + CTA + skip link only)
- [Phase 07-07]: [07-07] SpeechSupportBanner dismiss uses session-only useState — warning banner dismissal doesn't need to persist across sessions
- [Phase 07-04]: [07-04] SVG ring via strokeDashoffset on 54px-radius circle; RAF flag for 0-to-score% animation; vi.stubGlobal RAF in tests for synchronous jsdom assertions
- [v2.0 roadmap]: Whisper integration is Phase 13 (last) — COOP/COEP and worker-type incompatibility are environment-specific blocking pitfalls; all other v2.0 phases ship value without it
- [v2.0 roadmap]: Phase 8 (schema migration) is the unconditional prerequisite gate — all downstream phases read from Dexie v3 fields; undefined returns on v1 sessions without version bump
- [v2.0 roadmap]: FillerBreakdown (Phase 11) is Whisper-upgradeable by design — built on Web Speech baseline with a whisperFillers? prop that Phase 13 populates
- [v2.0 roadmap]: Whisper worker must be ES module ({ type: 'module' }); existing MediaPipe worker remains classic-mode — two separate workers, never coexisting in memory
- [v2.0 roadmap]: MediaPipe worker must be terminated before Whisper worker starts — combined WASM heap (300-600 MB + 100-200 MB) exceeds mid-range tab limits
- [Phase 08-01]: [08-01] Dexie v3 schema: WPMWindow + WhisperFillerResult types exported from db.ts; Session extended with wpmWindows?, whisperFillers?, whisperStatus?; upgrade callback clears v1.0 sessions per FOUND-01

### Roadmap Evolution

- Phase 5 added: UI Polish — fix all audit findings and elevate visual design quality across the full app
- Phase 6 added: Interactive UX improvements — custom tooltips, smarter filler detection, live captions
- Phase 7 added: Visual redesign — elevate frontend design quality with distinctive, impressive visual identity
- Phases 8-13 added: v2.0 Deeper Analytics milestone — schema migration, analytics panels, Whisper integration

### Pending Todos

None.

### Blockers/Concerns

- **[RESOLVED 01-02] MediaPipe-in-worker:** Classic-mode Web Worker with importScripts CONFIRMED working on Chrome. Proceed with this pattern in 02-01.
- **[RESOLVED 01-02] Filler word suppression:** EMPIRICALLY CONFIRMED as partial suppression. Web Speech API captures some but not all um/uh. Filler scoring in Phase 3 must treat counts as lower bounds. Whisper.wasm is deferred to v2 (AUD-v2-01).
- **Expressiveness and gesture thresholds uncalibrated:** No documented baseline values exist. Phase 2 implements heuristics; plan for threshold-tuning iteration after first real recordings in Phase 3.
- **[Phase 13 — NEEDS RESEARCH] COOP/COEP production headers:** Confirm window.crossOriginIsolated === true is achievable on the production hosting environment before writing any Whisper code. Audit all cross-origin resources for CORP header compatibility.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260315-j5e | Fix missing events in IndexedDB + update git remote to pitch-practice | 2026-03-15 | 7251ed9 | [260315-j5e-fix-missing-events-in-indexeddb-and-upda](.planning/quick/260315-j5e-fix-missing-events-in-indexeddb-and-upda/) |

## Session Continuity

Last session: 2026-03-16T19:41:34.145Z
Stopped at: Completed 08-01-PLAN.md — Dexie v3 schema migration
Resume file: None
