# Requirements: Presentation Coach

**Defined:** 2026-03-12
**Core Value:** You watch your own session back with a coach's eye: every filler word, eye contact break, and nervous gesture marked at the exact moment it happened.

## v1 Requirements

### Recording

- [x] **REC-01**: User can start a recording session (webcam + microphone via getUserMedia)
- [x] **REC-02**: Session UI shows only a timer and a stop button during recording (distraction-free)
- [x] **REC-03**: User can stop recording and be taken to the post-session review
- [x] **REC-04**: Session video blob is post-processed with fix-webm-duration before storage (enables scrubbing)
- [x] **REC-05**: Session is saved with metadata (date, duration, title) to IndexedDB via Dexie.js
- [x] **REC-06**: navigator.storage.persist() is called on first session to prevent storage eviction

### Audio Analysis

- [x] **AUD-01**: Real-time speech transcript is captured via Web Speech API during recording
- [x] **AUD-02**: Filler word occurrences (um, uh, like, you know) are detected and timestamped
- [x] **AUD-03**: Words per minute is calculated from the transcript
- [x] **AUD-04**: Significant pauses (>2 seconds of silence) are detected and timestamped
- [x] **AUD-05**: User sees a browser support warning when Web Speech API is unavailable (non-Chrome/Edge)

### Visual Analysis

- [x] **VIS-01**: MediaPipe inference runs in a Web Worker (not main thread) to prevent UI blocking
- [x] **VIS-02**: Eye contact events are detected (gaze toward vs. away from camera) and timestamped
- [x] **VIS-03**: Facial expressiveness is scored per-segment (animated vs. flat delivery) from landmark data
- [x] **VIS-04**: Nervous gesture events are detected (face touching, body sway) and timestamped
- [x] **VIS-05**: Frame capture is throttled to 5–10 fps during inference to stay within CPU budget

### Scorecard

- [x] **SCORE-01**: Post-session scorecard shows per-dimension scores (eye contact, fillers, pacing, expressiveness, gestures)
- [x] **SCORE-02**: Post-session scorecard shows a single overall score (weighted composite)
- [x] **SCORE-03**: Scorecard summary is stored alongside the session in IndexedDB

### Annotated Playback

- [x] **PLAY-01**: User can watch their recorded session video in a custom player
- [x] **PLAY-02**: Timeline shows event markers at timestamps where feedback events occurred
- [x] **PLAY-03**: User can click a timestamp marker to jump to that moment in the video
- [x] **PLAY-04**: Hovering or pausing on a marker shows a description of the event (e.g. "filler word: 'um'")

### Session History

- [x] **HIST-01**: User can view a list of past sessions with date, duration, and overall score
- [x] **HIST-02**: User can open any past session to view its scorecard and annotated playback
- [x] **HIST-03**: Progress trends are shown per dimension across sessions (chart or sparkline)

## v2.0 Requirements

### Foundation

- [x] **FOUND-01**: Dexie schema migrated to v3 with new fields (`whisperFillers`, `whisperStatus`, `wpmWindows`); v1.0 sessions cleared on upgrade (no backward compatibility required)
- [x] **FOUND-02**: WPM per 30s window calculated at session end and stored in `wpmWindows` for chart display

### Analytics

- [x] **ANAL-01**: User sees opening/closing strength as a new scorecard dimension (first/last 30s scored from existing event log)
- [x] **ANAL-02**: User sees pause count and average duration in the review page
- [x] **ANAL-03**: Pause quality (hesitation vs. deliberate) contributes to the pacing score
- [ ] **ANAL-04**: User sees filler breakdown by type (um, uh, like, you know...) in review
- [ ] **ANAL-05**: User sees which segment of their talk had the most fillers (session thirds)
- [ ] **ANAL-06**: User sees WPM over time as a chart (30s windows) in review

### Whisper

- [ ] **WHIS-01**: Filler score uses Whisper-derived counts post-session (more accurate than Web Speech)
- [ ] **WHIS-02**: Live captions during recording remain unaffected (Web Speech API unchanged)
- [ ] **WHIS-03**: User sees Whisper analysis status while post-session processing runs
- [ ] **WHIS-04**: First-time model download shows a progress indicator (doesn't silently hang)
- [ ] **WHIS-05**: App falls back to Web Speech counts if Whisper fails or is unsupported

## v3.0+ Candidates

- WPM variance scoring (reward deliberate rate modulation, not just display)
- Per-metric breakdown within opening/closing segments
- Multi-session trend charts for v2.0 dimensions
- Filler timing cluster visualization
- Vocal tone analysis (confidence, energy level)
- Export scorecard as PDF/image
- User accounts with cloud sync

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time feedback during recording | Explicit design intent — distraction-free session simulates real presenting |
| Real-time Whisper during recording | 2-5x slower than real-time in browser; would block UI |
| Server-side video processing | Privacy requirement + no backend |
| Mobile app | Web-first; MediaPipe + MediaRecorder are desktop browser primary |
| OAuth / authentication | Single-user local-only |
| AI-generated coaching tips | Competitors report users stop reading after 2-3 sessions |
| Content/semantic scoring | Different complexity class from delivery analytics |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REC-01 | Phase 1 | Complete |
| REC-02 | Phase 1 | Complete |
| REC-03 | Phase 1 | Complete |
| REC-04 | Phase 1 | Complete |
| REC-05 | Phase 1 | Complete |
| REC-06 | Phase 1 | Complete |
| AUD-01 | Phase 2 | Complete |
| AUD-02 | Phase 2 | Complete |
| AUD-03 | Phase 2 | Complete |
| AUD-04 | Phase 2 | Complete |
| AUD-05 | Phase 1 | Complete |
| VIS-01 | Phase 2 | Complete |
| VIS-02 | Phase 2 | Complete |
| VIS-03 | Phase 2 | Complete |
| VIS-04 | Phase 2 | Complete |
| VIS-05 | Phase 2 | Complete |
| SCORE-01 | Phase 3 | Complete |
| SCORE-02 | Phase 3 | Complete |
| SCORE-03 | Phase 3 | Complete |
| PLAY-01 | Phase 3 | Complete |
| PLAY-02 | Phase 3 | Complete |
| PLAY-03 | Phase 3 | Complete |
| PLAY-04 | Phase 3 | Complete |
| HIST-01 | Phase 4 | Complete |
| HIST-02 | Phase 4 | Complete |
| HIST-03 | Phase 4 | Complete |
| FOUND-01 | Phase 8 | Complete |
| FOUND-02 | Phase 8 | Complete |
| ANAL-01 | Phase 9 | Complete |
| ANAL-02 | Phase 10 | Complete |
| ANAL-03 | Phase 10 | Complete |
| ANAL-04 | Phase 11 | Pending |
| ANAL-05 | Phase 11 | Pending |
| ANAL-06 | Phase 12 | Pending |
| WHIS-01 | Phase 13 | Pending |
| WHIS-02 | Phase 13 | Pending |
| WHIS-03 | Phase 13 | Pending |
| WHIS-04 | Phase 13 | Pending |
| WHIS-05 | Phase 13 | Pending |

**Coverage:**
- v1 requirements: 26 total — Complete ✓
- v2.0 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-16 after v2.0 milestone start*
