# Presentation Coach

## What This Is

A browser-based tool that records your webcam and microphone while you practice a talk, then gives you an annotated video playback with timestamped feedback and a final scorecard. Built for anyone who wants to improve their presentation skills through deliberate solo practice — no instructor, no audience.

## Core Value

You watch your own session back with a coach's eye: every filler word, eye contact break, and nervous gesture marked at the exact moment it happened.

## Current Milestone: v2.0 — Deeper Analytics

**Goal:** Replace Web Speech API with Whisper.wasm for accurate filler counting, and add deeper analytics (pause scoring, filler breakdown, speaking rate variance, opening/closing strength) as both new scorecard dimensions and detail expansions within existing ones.

**Target features:**
- Whisper.wasm post-session audio analysis (alongside Web Speech API for live captions)
- Pause analytics — scored sub-dimension under Pacing, with count/duration breakdown
- Filler breakdown by type and timing clusters in review UI
- Speaking rate variance over time — WPM chart per 30s window
- Opening/closing strength — new scorecard dimension scoring first and last 30s

## Requirements

### Validated

- ✓ User can record a practice session (webcam + microphone, browser-based) — v1.0
- ✓ Session UI is distraction-free — just a timer and stop button — v1.0
- ✓ After session: annotated video playback with timestamped feedback events — v1.0
- ✓ Eye contact tracking (gaze toward/away from camera via MediaPipe) — v1.0
- ✓ Filler word detection (um, uh, like, you know — via Web Speech API) — v1.0
- ✓ Pacing analysis (words per minute, notable pauses — derived from transcript) — v1.0
- ✓ Facial expressiveness scoring (animated vs. flat delivery via landmarks) — v1.0
- ✓ Nervous gesture detection (face touching, swaying — MediaPipe hand + pose) — v1.0
- ✓ Post-session scorecard with per-dimension scores and an overall score — v1.0
- ✓ Session history persisted locally — track improvement across sessions over time — v1.0

### Active

- [ ] Post-session audio re-analyzed by Whisper.wasm for accurate filler counts
- [ ] Web Speech API live captions remain during recording (Whisper runs post-session only)
- [ ] Filler scorecard dimension uses Whisper-derived counts instead of Web Speech counts
- [ ] Filler breakdown by type (um, uh, like, etc.) shown in review UI
- [ ] Filler clustering by session segment visible in review UI
- [ ] Pause analytics scored as sub-dimension under Pacing
- [ ] Pause breakdown (count, avg duration) shown in review UI
- [ ] Speaking rate variance shown as WPM-over-time chart in review UI
- [ ] Opening/closing strength shown as new scorecard dimension (first 30s vs last 30s)

### Out of Scope

- User accounts / authentication — start local-only, add later if traction
- Real-time feedback overlay during session — distraction-free is the design intent
- Mobile app — web-first
- Server-side video processing — all analysis runs client-side in the browser
- Replacing live captions with Whisper — Web Speech API stays for real-time use

## Context

- Personal project first, potential product if it proves valuable
- Gap identified: existing presentation tools either require screen recording software + manual review, or are enterprise-grade ($$$) with coached recordings. No lightweight browser tool that automates the feedback loop.
- All ML inference runs in-browser via MediaPipe (face/hand/pose landmarks) and Web Speech API (transcript + filler detection)
- Sessions stored in browser (IndexedDB or localStorage) — no backend needed for v1

## Constraints

- **Platform**: Web browser only — must work without install
- **Processing**: Client-side only — no video uploaded to servers (privacy and cost)
- **ML Stack**: MediaPipe for visual analysis; Web Speech API for live captions; Whisper.wasm for post-session accurate transcription — all client-side
- **Scope**: single-user, local storage — no auth, no sync

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| All 5 metrics in v1 | User wants full feature set; nervous gestures are hardest but worth attempting | — Pending |
| Client-side ML only | Privacy (no video leaves device) + no backend infra needed | — Pending |
| Distraction-free session UI | Simulates real presentation; analysis revealed post-session | — Pending |
| Local storage for sessions | No auth complexity for v1; history still tracked | — Pending |

---
*Last updated: 2026-03-16 after v2.0 milestone start*
