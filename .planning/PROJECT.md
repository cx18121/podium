# Presentation Coach

## What This Is

A browser-based tool that records your webcam and microphone while you practice a talk, then gives you an annotated video playback with timestamped feedback and a final scorecard. Built for anyone who wants to improve their presentation skills through deliberate solo practice — no instructor, no audience.

## Core Value

You watch your own session back with a coach's eye: every filler word, eye contact break, and nervous gesture marked at the exact moment it happened.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can record a practice session (webcam + microphone, browser-based)
- [ ] Session UI is distraction-free — just a timer and stop button
- [ ] After session: annotated video playback with timestamped feedback events
- [ ] Eye contact tracking (gaze toward/away from camera via MediaPipe)
- [ ] Filler word detection (um, uh, like, you know — via Web Speech API)
- [ ] Pacing analysis (words per minute, notable pauses — derived from transcript)
- [ ] Facial expressiveness scoring (animated vs. flat delivery via landmarks)
- [ ] Nervous gesture detection (face touching, swaying — MediaPipe hand + pose)
- [ ] Post-session scorecard with per-dimension scores and an overall score
- [ ] Session history persisted locally — track improvement across sessions over time

### Out of Scope

- User accounts / authentication — start local-only, add later if traction
- Real-time feedback overlay during session — distraction-free is the design intent
- Mobile app — web-first
- Server-side video processing — all analysis runs client-side in the browser

## Context

- Personal project first, potential product if it proves valuable
- Gap identified: existing presentation tools either require screen recording software + manual review, or are enterprise-grade ($$$) with coached recordings. No lightweight browser tool that automates the feedback loop.
- All ML inference runs in-browser via MediaPipe (face/hand/pose landmarks) and Web Speech API (transcript + filler detection)
- Sessions stored in browser (IndexedDB or localStorage) — no backend needed for v1

## Constraints

- **Platform**: Web browser only — must work without install
- **Processing**: Client-side only — no video uploaded to servers (privacy and cost)
- **ML Stack**: MediaPipe for visual analysis, Web Speech API for audio — constrained to what runs well in browser
- **Scope**: v1 is single-user, local storage — no auth, no sync

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All 5 metrics in v1 | User wants full feature set; nervous gestures are hardest but worth attempting | — Pending |
| Client-side ML only | Privacy (no video leaves device) + no backend infra needed | — Pending |
| Distraction-free session UI | Simulates real presentation; analysis revealed post-session | — Pending |
| Local storage for sessions | No auth complexity for v1; history still tracked | — Pending |

---
*Last updated: 2026-03-11 after initialization*
