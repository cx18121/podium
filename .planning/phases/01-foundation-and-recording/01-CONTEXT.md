# Phase 1: Foundation and Recording - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Verified project scaffold, three architecture spikes (MediaPipe-in-worker, WebM seekability, Chrome filler word suppression), and a working recording pipeline that produces a correctly formed, seekable WebM blob persisted to IndexedDB. This phase ends when a user can record a session and have it saved. Review and analysis features are Phase 2+.

</domain>

<decisions>
## Implementation Decisions

### Self-view during recording
- Camera feed is completely hidden during recording — no self-view at all
- This is intentional: simulates real presenting, enforces the distraction-free design
- Before recording starts (on the pre-session setup screen), the camera feed IS shown so the user can check their framing
- Once the user hits "Start Recording", the feed is hidden for the duration

### Session naming
- Sessions are auto-named with date + time (e.g., "March 12, 2026 — 3:41 PM")
- After stopping, the user is shown an optional prompt to give the session a custom name before saving
- If skipped, the auto date/time name is used
- Sessions can be renamed later from the history view (Phase 4 will implement rename UI, but the data model should support it from Phase 1)

### Permission & error states
- Camera/mic permission denied: Claude's discretion — handle gracefully with clear instructions on how to re-enable
- Web Speech API unavailable (non-Chrome/Edge): Non-blocking banner warning on the start screen — "Audio analysis requires Chrome or Edge. Eye contact, expressiveness, and gesture analysis will still work." Does NOT block the user from recording.

### Home / start screen
- First visit (no sessions): Welcome screen with a brief intro explaining what the app does, then a "Start Recording" button. No camera shown until the setup screen.
- After sessions exist: Claude's discretion — home screen routing can be whatever feels natural (e.g., redirect to history, or keep recording screen as home with a history nav link)

### Claude's Discretion
- Permission denied UI design (error message style, retry button behavior)
- Home screen routing once sessions exist
- Self-view corner position (not applicable since feed is hidden)
- Loading/initialization state while MediaPipe models download

</decisions>

<specifics>
## Specific Ideas

- The recording UI should feel like a presentation timer app — clean, minimal, just a running clock and a way to stop
- The pre-recording setup screen shows the camera feed so the user can check they're in frame before starting

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield project

### Established Patterns
- None yet — Phase 1 establishes the patterns

### Integration Points
- Dexie schema v1 established in Phase 1 must support: session metadata (id, title, date, duration), video Blob, event log (Phase 2 will add events), scorecard (Phase 3 will add scores)
- Web Worker setup (classic mode, not ES module — Vite config) established in Phase 1 as the pattern for Phase 2's ML worker

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation-and-recording*
*Context gathered: 2026-03-12*
