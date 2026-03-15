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

## v2 Requirements

### Audio Analysis

- **AUD-v2-01**: Whisper WASM fallback for filler word detection when Chrome suppresses Web Speech API disfluencies
- **AUD-v2-02**: Vocal tone analysis (confidence, energy level)

### Sharing & Export

- **SHARE-01**: User can export scorecard as PDF or image
- **SHARE-02**: User can share a session summary link (requires backend)

### Multi-user

- **USER-01**: User accounts with cloud sync of session history
- **USER-02**: Coach mode — share a session with someone else for review

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time feedback during recording | Explicit design intent — distraction-free session simulates real presenting |
| Server-side video processing | Privacy requirement + no backend for v1 |
| Mobile app | Web-first; MediaPipe + MediaRecorder are desktop browser primary |
| OAuth / authentication | Single-user local-only for v1 |
| Live audience simulation | Out of scope for solo practice tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REC-01 | Phase 1 | Complete |
| REC-02 | Phase 1 | Complete |
| REC-03 | Phase 1 | Complete |
| REC-04 | Phase 1 | Complete |
| REC-05 | Phase 1 | In Progress (schema defined in 01-01, full save in 01-03) |
| REC-06 | Phase 1 | Complete |
| AUD-01 | Phase 2 | Complete |
| AUD-02 | Phase 2 | Complete |
| AUD-03 | Phase 2 | Complete |
| AUD-04 | Phase 2 | Complete |
| AUD-05 | Phase 1 | In Progress (test stub in 01-01, component in 01-03) |
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

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after roadmap creation*
