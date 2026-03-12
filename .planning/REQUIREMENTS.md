# Requirements: Presentation Coach

**Defined:** 2026-03-12
**Core Value:** You watch your own session back with a coach's eye: every filler word, eye contact break, and nervous gesture marked at the exact moment it happened.

## v1 Requirements

### Recording

- [ ] **REC-01**: User can start a recording session (webcam + microphone via getUserMedia)
- [ ] **REC-02**: Session UI shows only a timer and a stop button during recording (distraction-free)
- [ ] **REC-03**: User can stop recording and be taken to the post-session review
- [ ] **REC-04**: Session video blob is post-processed with fix-webm-duration before storage (enables scrubbing)
- [ ] **REC-05**: Session is saved with metadata (date, duration, title) to IndexedDB via Dexie.js
- [ ] **REC-06**: navigator.storage.persist() is called on first session to prevent storage eviction

### Audio Analysis

- [ ] **AUD-01**: Real-time speech transcript is captured via Web Speech API during recording
- [ ] **AUD-02**: Filler word occurrences (um, uh, like, you know) are detected and timestamped
- [ ] **AUD-03**: Words per minute is calculated from the transcript
- [ ] **AUD-04**: Significant pauses (>2 seconds of silence) are detected and timestamped
- [ ] **AUD-05**: User sees a browser support warning when Web Speech API is unavailable (non-Chrome/Edge)

### Visual Analysis

- [ ] **VIS-01**: MediaPipe inference runs in a Web Worker (not main thread) to prevent UI blocking
- [ ] **VIS-02**: Eye contact events are detected (gaze toward vs. away from camera) and timestamped
- [ ] **VIS-03**: Facial expressiveness is scored per-segment (animated vs. flat delivery) from landmark data
- [ ] **VIS-04**: Nervous gesture events are detected (face touching, body sway) and timestamped
- [ ] **VIS-05**: Frame capture is throttled to 5–10 fps during inference to stay within CPU budget

### Scorecard

- [ ] **SCORE-01**: Post-session scorecard shows per-dimension scores (eye contact, fillers, pacing, expressiveness, gestures)
- [ ] **SCORE-02**: Post-session scorecard shows a single overall score (weighted composite)
- [ ] **SCORE-03**: Scorecard summary is stored alongside the session in IndexedDB

### Annotated Playback

- [ ] **PLAY-01**: User can watch their recorded session video in a custom player
- [ ] **PLAY-02**: Timeline shows event markers at timestamps where feedback events occurred
- [ ] **PLAY-03**: User can click a timestamp marker to jump to that moment in the video
- [ ] **PLAY-04**: Hovering or pausing on a marker shows a description of the event (e.g. "filler word: 'um'")

### Session History

- [ ] **HIST-01**: User can view a list of past sessions with date, duration, and overall score
- [ ] **HIST-02**: User can open any past session to view its scorecard and annotated playback
- [ ] **HIST-03**: Progress trends are shown per dimension across sessions (chart or sparkline)

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

Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REC-01 | — | Pending |
| REC-02 | — | Pending |
| REC-03 | — | Pending |
| REC-04 | — | Pending |
| REC-05 | — | Pending |
| REC-06 | — | Pending |
| AUD-01 | — | Pending |
| AUD-02 | — | Pending |
| AUD-03 | — | Pending |
| AUD-04 | — | Pending |
| AUD-05 | — | Pending |
| VIS-01 | — | Pending |
| VIS-02 | — | Pending |
| VIS-03 | — | Pending |
| VIS-04 | — | Pending |
| VIS-05 | — | Pending |
| SCORE-01 | — | Pending |
| SCORE-02 | — | Pending |
| SCORE-03 | — | Pending |
| PLAY-01 | — | Pending |
| PLAY-02 | — | Pending |
| PLAY-03 | — | Pending |
| PLAY-04 | — | Pending |
| HIST-01 | — | Pending |
| HIST-02 | — | Pending |
| HIST-03 | — | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 0
- Unmapped: 26 ⚠️ (pending roadmap creation)

---
*Requirements defined: 2026-03-12*
*Last updated: 2026-03-12 after initial definition*
