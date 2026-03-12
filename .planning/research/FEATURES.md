# Feature Research

**Domain:** Browser-based presentation coaching / public speaking practice app
**Researched:** 2026-03-12
**Confidence:** MEDIUM (ecosystem well-surveyed; UX tradeoffs draw on multiple sources; browser ML limitations verified via official docs and dev community)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Webcam + mic recording in browser | Any coaching tool that can't capture you is broken at the foundation | LOW | MediaStream API; must request permissions gracefully and handle denials |
| Session playback (plain video review) | Users expect to watch themselves back — this is the minimum value loop | LOW | Store blob URL or IndexedDB chunk; preload before playback UI |
| Filler word detection (um, uh, like, you know) | Every competing tool (Orai, Yoodli, Ummo, PowerPoint Speaker Coach) has this | MEDIUM | Web Speech API works in Chrome/Edge only; ~30-40% of browsers unsupported; audio sent to Google servers, not truly offline |
| Words-per-minute / pacing feedback | Users consider this basic — even PowerPoint Speaker Coach has it | MEDIUM | Derived from transcript + timing; pause detection needs threshold tuning |
| Post-session report / scorecard | Speeko, Orai, Yoodli all provide a per-session summary; missing it feels unfinished | MEDIUM | Aggregate per-dimension scores into a single view; must show both scores and what drove them |
| Session history / progress over time | Users want to see if they are improving; streak/trend charts are expected | MEDIUM | IndexedDB for local persistence; chart library needed for trend visualization |
| Eye contact tracking | Present in VirtualSpeech, Orai, Yoodli; considered a core delivery metric | HIGH | MediaPipe Face Landmarker; iris landmark quality varies with lighting and movement; needs confidence thresholding |
| Distraction-free recording UI | Users cite anxiety during recording; a cluttered UI increases it | LOW | Timer + stop button only; remove all non-essential chrome |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Annotated video playback with timestamped event markers | No lightweight browser tool does this at all; Yoodli/Orai show post-session stats but not a marked-up timeline you scrub through | HIGH | Core UX differentiator per PROJECT.md; requires storing event timestamps during recording, then rendering overlays synced to video currentTime |
| Facial expressiveness scoring | Rare in lightweight tools; competitors focus on audio; this catches flat/robotic delivery | HIGH | MediaPipe blendshape scores (jaw open, brow raise, lip corner pull etc.); needs baseline calibration per-user to avoid penalizing naturally reserved speakers |
| Nervous gesture detection (face touching, swaying) | No browser-based tool currently detects this; VR tools (VirtualSpeech) touch on it but require hardware | HIGH | Hardest signal: MediaPipe Pose + Hand Landmarker; hand-to-face proximity heuristic; sway = hip/shoulder lateral drift over time; false positive rate will be elevated |
| All analysis runs 100% client-side (no video upload) | Strong privacy differentiator vs. Yoodli/Orai which send audio/video to cloud; meaningful to users practicing sensitive content | MEDIUM | ML models download once and run in WASM/WebGL; trade-off is initial load time (MediaPipe bundles are 2-8 MB per task) |
| Timestamped transcript alongside video | Users can search "where did I say 'um' the most" and jump there | MEDIUM | Web Speech API provides word-level timestamps in interim/final results; store alongside event log |
| Per-dimension trend charts across sessions | Users want to see "my filler words dropped from 12 to 4 over 5 sessions" | MEDIUM | Requires consistent schema for session records; chart complexity is low once data exists |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time feedback overlay during recording | Users assume more feedback = more value; Poised does this for Zoom | Breaks the simulation of real presenting; you wouldn't have a coach whispering mid-talk; creates anxiety and divided attention; PROJECT.md explicitly rules this out | Reveal all feedback post-session; annotated playback gives the "aha" moment without the distraction |
| AI-generated coaching advice / prescriptive text tips | Every tool does it; users initially like it | Competitors report users stop reading standardized advice after 2-3 sessions ("pause more" is useless without knowing where); creates maintenance burden for advice copy | Show quantitative data clearly — "14 filler words, mostly in the first 90 seconds"; let users draw their own conclusions; optionally add a single targeted tip only when a metric is clearly outlying |
| User accounts and cloud sync (v1) | Users may ask for it to access history across devices | Adds auth complexity, server infra, data storage costs, and privacy surface — all before the core loop is validated; PROJECT.md explicitly defers this | Local IndexedDB; export-to-file if user wants a backup; revisit if traction justifies backend |
| Mobile / native app | "Why can't I use this on my phone?" | MediaPipe performance on mobile browsers is constrained; webcam quality is worse; phone form factor does not simulate standing presentation; portrait video is wrong aspect ratio | Web-first on desktop; mobile browser may work at degraded quality as a later bonus, not a target |
| Slide deck integration | Some users want to practice with their actual slides visible | Adds significant scope — requires PDF/PPTX parsing or screen share capture; distracts from the core coaching loop | Keep tool deck-agnostic; user opens their slides in another window and shares screen if they want that simulation; do not build it in |
| Social / sharing features (share your scorecard) | Could drive viral growth | Privacy-sensitive data; users practicing for job interviews or sensitive presentations don't want this; adds social engineering attack surface | Defer entirely; if added later, make opt-in export only |
| Detailed vocal tone / sentiment analysis | Sounds impressive | Web Speech API provides transcripts only, not raw audio features; vocal analysis (energy, pitch) requires AudioContext + custom signal processing — high complexity for uncertain accuracy gain | Focus on what the chosen stack does well: filler words, pacing, and silence/pause detection from transcript timing |

---

## Feature Dependencies

```
[Webcam + Mic Recording]
    └──required-by──> [Session Playback]
    └──required-by──> [Eye Contact Tracking]
    └──required-by──> [Facial Expressiveness Scoring]
    └──required-by──> [Nervous Gesture Detection]
    └──required-by──> [Filler Word Detection]        (mic only)
    └──required-by──> [Pacing Analysis]              (mic only)

[Filler Word Detection]
    └──required-by──> [Pacing Analysis]              (shares transcript)
    └──required-by──> [Timestamped Transcript]

[Session Playback]
    └──required-by──> [Annotated Video Playback]

[Annotated Video Playback]
    └──requires──> [Event Timestamp Log]             (produced during analysis)
    └──requires──> [Session Playback]

[Post-Session Scorecard]
    └──requires──> [Eye Contact Tracking]
    └──requires──> [Filler Word Detection]
    └──requires──> [Pacing Analysis]
    └──requires──> [Facial Expressiveness Scoring]
    └──requires──> [Nervous Gesture Detection]

[Session History / Progress Charts]
    └──requires──> [Post-Session Scorecard]          (needs consistent score schema)
    └──requires──> [Local Storage Persistence]
```

### Dependency Notes

- **Annotated video playback requires event timestamp log:** During recording, each detection event (filler word, eye contact break, gesture) must be stored with a wall-clock offset from recording start. This log is the foundation for the annotated playback; if the data schema is wrong, the playback UI cannot be built on top of it.
- **Filler word detection and pacing analysis share the transcript:** Both features read from the same Web Speech API transcript stream; they should be computed in a single pass rather than independently.
- **Post-session scorecard requires all five analysis dimensions:** The scorecard is a downstream aggregation — it cannot be built until each individual metric is producing reliable output. Building the scorecard before individual metrics are stable risks surfacing bad scores to users.
- **Session history requires a stable score schema:** If the per-dimension scoring formula changes between versions, historical data becomes incomparable. Lock the schema early or include a version field in each session record.
- **Eye contact, expressiveness, and gesture detection all share MediaPipe setup:** The Face Landmarker, Hand Landmarker, and Pose Landmarker tasks can share a single WASM runtime instance. Initialize once; instantiating three separate runtimes wastes memory and causes model download duplication.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [ ] Webcam + mic recording (browser, distraction-free UI with timer + stop) — without this nothing else exists
- [ ] Eye contact tracking via MediaPipe Face Landmarker — highest-visibility metric; users check this first
- [ ] Filler word detection via Web Speech API — most universally understood metric; validates the audio pipeline
- [ ] Pacing analysis (WPM + pause detection) — shares transcript with filler words; low marginal cost
- [ ] Post-session scorecard with per-dimension scores — closes the feedback loop; without it the session has no payoff
- [ ] Annotated video playback with timestamped events — the core differentiator per PROJECT.md; defines the product
- [ ] Session history with basic trend (last N sessions per metric) — validates the "improvement over time" value proposition
- [ ] Facial expressiveness scoring — included in v1 per project decision; adds depth to the visual analysis
- [ ] Nervous gesture detection — included in v1 per project decision; hardest signal, most likely to need iteration

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Timestamped, searchable transcript view alongside playback — when users confirm annotated playback is the core use, this enhances it; trigger: positive feedback on playback UX
- [ ] Per-dimension trend charts (sparklines or full chart view) — when session history accumulates enough data to be meaningful (5+ sessions); trigger: users ask "how do I see my progress visually?"
- [ ] Export session data (JSON or CSV) — enables power users and builds trust before cloud sync; trigger: any user asks for backup/portability
- [ ] Calibration / baseline session — lets expressiveness and gesture scoring account for individual baselines; trigger: users report false positives on those two metrics

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Cloud sync / user accounts — defer until local-only is proven insufficient; adds full backend scope
- [ ] AI-generated coaching tips — defer until quantitative feedback is validated; avoids the "generic advice" trap
- [ ] Slide deck overlay (picture-in-picture or side-by-side) — significant added scope; only worth it if users repeatedly ask for it
- [ ] Multi-language filler word support — Web Speech API supports multiple languages; but filler words are language-specific lists; defer until non-English users appear
- [ ] Structured practice exercises / lesson plans (Speeko-style curriculum) — transforms the product from a practice recorder into a coaching platform; different scope entirely

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Webcam + mic recording | HIGH | LOW | P1 |
| Distraction-free recording UI | HIGH | LOW | P1 |
| Filler word detection | HIGH | MEDIUM | P1 |
| Pacing analysis | HIGH | LOW (shares transcript) | P1 |
| Eye contact tracking | HIGH | HIGH | P1 |
| Annotated video playback (timestamped) | HIGH | HIGH | P1 |
| Post-session scorecard | HIGH | MEDIUM | P1 |
| Session history / local persistence | MEDIUM | MEDIUM | P1 |
| Facial expressiveness scoring | MEDIUM | HIGH | P1 (per project decision) |
| Nervous gesture detection | MEDIUM | HIGH | P1 (per project decision) |
| Timestamped transcript view | MEDIUM | LOW | P2 |
| Per-dimension trend charts | MEDIUM | MEDIUM | P2 |
| Export session data | LOW | LOW | P2 |
| Per-user calibration baseline | LOW | MEDIUM | P2 |
| AI-generated coaching tips | LOW | MEDIUM | P3 |
| Cloud sync / accounts | LOW | HIGH | P3 |
| Slide deck integration | LOW | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | PowerPoint Speaker Coach | Yoodli | Orai | VirtualSpeech | Our Approach |
|---------|--------------------------|--------|------|----------------|--------------|
| Filler word detection | Yes | Yes | Yes | Yes | Yes — via Web Speech API transcript scan |
| Pacing / WPM | Yes | Yes | Yes | Yes | Yes — derived from transcript + timing |
| Eye contact | No | Yes (post-session stats) | Yes (stats) | Yes (VR) | Yes — MediaPipe iris landmarks, annotated on timeline |
| Facial expressiveness | No | No | No | Partial (smile detection) | Yes — MediaPipe blendshapes |
| Nervous gesture detection | No | No | No | Partial (VR body tracking) | Yes — MediaPipe Pose + Hand; highest difficulty |
| Annotated video timeline | No | No | No | No | Yes — core differentiator |
| Post-session scorecard | Yes | Yes | Yes | Yes | Yes |
| Session history | No | Yes (cloud) | Yes (cloud) | Yes (cloud) | Yes — local IndexedDB |
| Client-side / no upload | No (cloud) | No (cloud) | No (cloud) | No (cloud) | Yes — privacy differentiator |
| Browser-based, no install | Requires Office/web | Web (account required) | Mobile app | VR headset or web app | Yes — zero-install browser |

**Key gap in the market:** No existing lightweight tool combines annotated video playback with timestamped events + full client-side privacy + zero install. PowerPoint Speaker Coach is the closest in accessibility but lacks video review and eye contact; Yoodli/Orai are cloud-dependent and mobile-first.

---

## Sources

- [Orai — AI-powered app for practicing presentations](https://orai.com/)
- [Yoodli — AI Roleplay Platform for Communication Coaching](https://yoodli.ai/)
- [VirtualSpeech — Improve Eye Contact with VR Practice](https://virtualspeech.com/blog/practice-virtual-reality-improve-eye-contact)
- [Duarte — Can AI help with public speaking? Review of AI platforms](https://www.duarte.com/blog/review-of-public-speaking-ai-platforms/)
- [Speeko — AI Speech Coach for Public Speaking](https://www.speeko.co/)
- [PowerPoint Speaker Coach — Microsoft Support](https://support.microsoft.com/en-us/office/rehearse-your-slide-show-with-speaker-coach-cd7fc941-5c3b-498c-a225-83ef3f64f07b)
- [BoldVoice — 10 Best Public Speaking Apps 2025](https://boldvoice.com/blog/best-public-speaking-apps)
- [VocaFuse — Web Speech API vs Cloud APIs 2025](https://vocafuse.com/blog/web-speech-api-vs-cloud-apis/)
- [Roboflow — How to Build Real-Time Eye Tracking in the Browser](https://blog.roboflow.com/build-eye-tracking-in-browser/)
- [MediaPipe Face Landmarker — Google for Developers](https://developers.google.com/mediapipe/solutions/vision/face_detector)
- [New Features in PowerPoint's Presenter Coach (2025)](https://www.free-power-point-templates.com/articles/new-features-in-powerpoints-presenter-coach-2020/)
- [VirtualSpeech — Best Public Speaking Apps 2026](https://virtualspeech.com/learn/public-speaking-apps)

---
*Feature research for: browser-based presentation coaching app*
*Researched: 2026-03-12*
