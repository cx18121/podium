# Feature Research

**Domain:** Browser-based presentation coaching / public speaking practice app
**Researched:** 2026-03-16 (v2.0 analytics update; original research 2026-03-12)
**Confidence:** MEDIUM-HIGH (v1.0 features HIGH from prior research; v2.0 analytics features MEDIUM — methodology sourced from ETS SpeechRater, academic research, and competitor feature analysis; browser Whisper confirmed via official ggml.ai/whisper.cpp docs)

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

## v2.0 Analytics Features

This section covers the five new analytics features being added in the v2.0 milestone. Each entry documents what the feature is, how it is typically measured in the industry, and what constitutes table stakes vs. differentiator level of implementation.

---

### Feature: Whisper.wasm Post-Session Transcription

**What it does:** After session ends, re-analyzes the recorded audio using OpenAI Whisper running in-browser via WebAssembly. Replaces Web Speech API filler counts with more accurate Whisper-derived counts.

**How it is typically measured:**
Whisper (base model) achieves ~97-98% word accuracy on clean English audio per MLCommons 2025 benchmarks. It produces word-level timestamps via the `--word_timestamps` flag in whisper.cpp. The WASM build (whisper.cpp compiled to WebAssembly) runs in the browser with no server upload required. The tiny/base models are viable for browser use; larger models are impractical at 500 MB+.

**Table stakes level:**
- Post-session run (not real-time) — running Whisper during recording would block the main thread and delay feedback
- Word-level timestamps — needed to place filler events on the annotated timeline
- Accurate filler counts replacing Web Speech API counts — this is the stated goal

**Differentiator level:**
- Keeping Web Speech API for live captions during recording while Whisper runs post-session — this dual-path architecture is unusual; most tools pick one or the other
- Timestamped word-by-word transcript available for UI scrubbing

**Complexity:** HIGH. Whisper.wasm is ~15-30 MB model download for tiny model; requires SharedArrayBuffer (needs COOP/COEP headers); processing time is 2-5x real-time on base model in browser. Requires careful worker thread management to avoid blocking UI.

**Dependency on existing:** Depends on audio recording blob produced by MediaRecorder. Feeds into: filler scorecard dimension, filler breakdown UI, pause analytics (timestamps), and WPM variance chart.

---

### Feature: Pause Analytics (Scored Sub-Dimension)

**What it does:** Analyzes the distribution, count, and duration of silences in the speech. Scored as a sub-dimension within the existing Pacing dimension on the scorecard.

**How it is typically measured (industry research):**

Per ETS SpeechRater (used in TOEFL Speaking assessment, one of the most thoroughly documented automated speech scoring systems):
- Silence threshold: any gap between words exceeding 0.145 seconds is counted as a pause
- Long silence: pauses exceeding 0.5 seconds are categorized separately
- The "Distribution of Pauses" (DP) score penalizes pauses that fall mid-clause (between adjacent words in the same sentence), which signals disfluency; pauses at clause or sentence boundaries are not penalized
- Score degrades with every mid-clause interruption point

Per academic research on connected speech (PMC 2024, Gao et al. 2025):
- Optimal silence threshold for second-language fluency measurement: 0.25-0.5 seconds
- Articulation rate (excluding pauses) vs. speech rate (including pauses) are distinct metrics; both matter

Per general public speaking coaching norms:
- Deliberate pauses (2-3 seconds at sentence boundaries) are a positive signal, not negative; Toastmasters and VirtualSpeech both advise speakers to pause for emphasis
- Problematic pauses are: (a) too frequent (more than 1 per 10 words), (b) mid-sentence, or (c) excessively long (>4 seconds when not deliberate)
- Recommended scoring approach: penalize pause rate (pauses per minute) and average mid-clause pause duration separately; do NOT penalize sentence-boundary pauses of reasonable length

**Recommended scoring formula for this app:**
```
pause_score = 100
  - (mid_clause_pauses_per_minute * 5)    // penalize disfluent mid-sentence gaps
  - (long_pauses_over_4s * 3)             // penalize excessively long stalls
  + (sentence_boundary_pauses > 0 ? 5 : 0) // small bonus for deliberate pause use
```
Cap at 0 and 100. Classify pauses from Whisper word timestamps: gaps between adjacent words in same sentence = mid-clause; gaps where prior word ends a sentence = boundary.

**Table stakes level:**
- Count of pauses and average duration shown in review UI
- Scored sub-dimension in existing Pacing scorecard card

**Differentiator level:**
- Breakdown by type: mid-clause vs. sentence-boundary pauses
- Pause markers on the annotated video timeline (making long pauses visually obvious during playback)
- "Pause at key moments" feedback — rewarding deliberate strategic use

**Complexity:** MEDIUM. Pause detection is derived from Whisper word timestamps (gaps between adjacent words). Boundary vs. mid-clause classification requires sentence segmentation from transcript (look for period/question/exclamation before the gap).

**Dependency on existing:** Requires Whisper.wasm timestamps. Feeds into: Pacing scorecard sub-dimension, annotated timeline markers.

---

### Feature: Filler Breakdown by Type and Timing Clusters

**What it does:** Instead of a single filler count, shows per-type counts (um, uh, like, you know, basically, so, right, actually) and identifies whether fillers cluster in specific segments (opening, middle, closing, or under-topic-transition pressure).

**How it is typically measured:**

Orai, Yoodli, and Microsoft Speaker Coach all track filler frequency but none (per competitor research) publicly expose per-type breakdown in their UIs. Per-type breakdown is an academic standard — ETS SpeechRater tracks filled pauses separately from silent pauses. Research distinguishes between:
- Filled pauses (um, uh) — most stigmatized; linked to cognitive load at word search boundary
- Discourse markers used as fillers (like, you know, so, right, basically) — habitual; linked to speaker anxiety or habit rather than cognitive load
- Repetitions and self-repairs — distinct category; indicates backtracking

Timing clusters matter because filler density spikes are more informative than average rate. A speaker who says 12 "um"s in the first 30 seconds (while nervous) and zero thereafter looks very different from one who says them uniformly throughout.

**Table stakes level:**
- Per-type count table in review UI (um: 4, uh: 2, like: 6, you know: 1)
- Total filler count on scorecard (already exists; now Whisper-derived)

**Differentiator level:**
- Segment clustering: divide session into thirds (or fixed 30s windows); show filler density per segment as a small bar chart
- Distinguish filled pauses (um/uh) from discourse markers (like/you know) with separate sub-counts — filled pauses are harder to fix and more penalized in formal contexts
- Filler markers on annotated timeline (already planned; this enhances the data behind those markers)

**Complexity:** LOW-MEDIUM. Whisper transcript provides the text with timestamps; filler detection is pattern matching on word strings. Clustering is grouping events by time bucket. The hard part is already done (Whisper integration).

**Dependency on existing:** Requires Whisper.wasm word-level transcript. Extends existing filler event log schema to include `filler_type` field.

---

### Feature: Speaking Rate Variance (WPM Over Time)

**What it does:** Instead of a single average WPM, shows how speaking rate changes across the session — plotted as WPM per 30-second window, displayed as a line chart in the review UI.

**How it is typically measured:**

Microsoft Speaker Coach (per official docs) shows "a graph showing the rough variance of your speaking rate over time" — confirming this is a known, expected feature in the presentation coaching domain. Target range: 100-165 WPM per Speaker Coach; 120-160 WPM per general public speaking guidance; 150 WPM often cited as optimal for comprehension.

Rate variance is considered a positive signal when deliberate: best speakers vary rate to emphasize key points (slow down) and maintain energy (speed up for lists/transitions). Uniform rate is a sign of mechanical delivery. Scoring rate variance therefore has two components:
1. Average rate — penalize if consistently outside 100-165 WPM
2. Rate variation — reward moderate variance (coefficient of variation 10-25%); penalize either complete uniformity (robotic) or extreme swings (uncontrolled)

Per academic research (Gao et al. 2025; VirtualSpeech):
- Syllables per minute (SPM) is more precise than WPM because word length varies; however, WPM is more interpretable to users
- For a coaching UX, WPM is the right unit to display; SPM can be used internally for scoring if needed

**Recommended scoring approach:**
```
average_wpm_score = gaussian_score(average_wpm, target=140, tolerance=25)
  // peaks at 140 WPM; 100 and 165 are the ±2σ edges

variance_score = reward if cv(wpm_windows) in [0.08, 0.25]
  // too flat = robotic; too variable = uncontrolled
```

**Table stakes level:**
- WPM-over-time line chart in review UI (30-second windows)
- Average WPM displayed prominently alongside the chart

**Differentiator level:**
- Annotated chart highlighting the opening 30s and closing 30s windows (ties into opening/closing strength feature)
- "Rate too fast" or "rate too slow" inline annotations on the chart for windows outside the target range
- Scoring variance itself as a component of the Pacing score (rewards deliberate variation)

**Complexity:** LOW-MEDIUM. Calculate word count per 30s window from Whisper timestamps. Chart rendering is a simple line chart with existing chart library. The scoring formula is straightforward once the data is bucketed.

**Dependency on existing:** Requires Whisper.wasm word-level timestamps. Extends the Pacing scorecard dimension. Chart goes in the review/scorecard UI.

---

### Feature: Opening/Closing Strength (New Scorecard Dimension)

**What it does:** Scores the first 30 seconds and last 30 seconds of the presentation independently as a new "Opening/Closing" scorecard dimension, reflecting the outsized importance of first and last impressions.

**How it is typically measured:**

Public speaking research and coaching literature consistently identifies openings and closings as the highest-impact segments. Harvard Business School research cites the "thin slice" phenomenon: audiences form lasting judgments of speakers within the first few seconds. The Competent Speaker Speech Evaluation Form (widely used in US higher education) and Toastmasters evaluation rubrics both score introduction and conclusion as distinct criteria.

What "strength" means in the first 30 seconds (measurable signals):
- **Low filler density** — high filler rate in the opening signals nervousness before the speaker settles in; this is the most common pattern and is reliably measurable
- **Pacing in target range** — speakers who open too fast are rushing through nerves; too slow suggests a stumbling start
- **Minimal pauses** (especially mid-clause) — excessive hesitation in the opening erodes credibility quickly
- **Eye contact maintained** — the existing eye contact tracker already captures this; it's more damaging in the first 30s than mid-session

What "strength" means in the last 30 seconds:
- **Low filler density** — trailing off into fillers undermines the conclusion
- **Consistent or slowing pace** — a deliberate slowdown signals a conclusion; speeding up suggests rushing to finish
- **No excessive pausing** — long awkward pauses at the end signal the speaker doesn't know how to close

No current lightweight tool (Orai, Yoodli, Speaker Coach) surfaces opening/closing as a dedicated scored dimension. This is a genuine differentiator.

**Recommended scoring formula:**
```
segment_score(segment_words, segment_duration_s) =
  filler_rate_score(fillers_in_segment / segment_words)     // weight: 40%
  + wpm_score(segment_words / (segment_duration_s / 60))    // weight: 30%
  + pause_rate_score(mid_clause_pauses_in_segment)          // weight: 20%
  + eye_contact_score(gaze_on_camera_ratio_in_segment)      // weight: 10%

opening_closing_score = (opening_score + closing_score) / 2
```

The eye contact component draws from the existing MediaPipe eye contact tracker (already time-bucketed by frame).

**Table stakes level:**
- Scorecard dimension with a single opening/closing score
- First 30s and last 30s scores shown separately (not just combined)

**Differentiator level:**
- Per-metric breakdown within opening and closing (filler rate, pacing, pause rate shown separately for each segment)
- Highlighted segment in the WPM-over-time chart (first and last 30s visually marked)
- Timeline annotation for the opening and closing windows in annotated playback

**Complexity:** MEDIUM. The 30-second window segmentation is straightforward from timestamps. The score aggregates signals already being computed (filler events, WPM, pause events, eye contact). The main work is: (1) defining the segment boundary precisely when a session is shorter than 60 seconds (edge case), (2) computing per-segment sub-scores from events already in the event log.

**Dependency on existing:** Requires Whisper.wasm timestamps (filler events, pacing), existing eye contact tracker (gaze events), existing event timestamp log. Adds new scorecard dimension; must be added to session schema with a version bump to avoid breaking history comparisons.

---

## v2.0 Feature Classification Summary

### Table Stakes for v2.0

| Feature | Why Expected at This Milestone | Complexity | Dependency |
|---------|-------------------------------|------------|------------|
| Whisper.wasm replaces Web Speech for filler counts | Web Speech filler detection is low-accuracy; if the scorecard is the product, wrong counts undermine trust | HIGH | MediaRecorder audio blob |
| Filler breakdown by type (um/uh vs. like/you know) | Users already ask "which fillers do I use?"; a single count is opaque | LOW | Whisper transcript |
| WPM-over-time chart (30s windows) | Speaker Coach already has this; users expect more than average WPM | LOW-MEDIUM | Whisper timestamps |
| Pause count and avg duration in review UI | Users see pauses marked on timeline but can't currently see aggregate stats | LOW | Whisper timestamps |

### Differentiators for v2.0

| Feature | Value Proposition | Complexity | Dependency |
|---------|-------------------|------------|------------|
| Pause scored as sub-dimension with mid-clause vs. boundary classification | No lightweight tool distinguishes strategic pauses from disfluent ones | MEDIUM | Whisper timestamps + sentence segmentation |
| Opening/closing strength as new scorecard dimension | No competitor surfaces this; directly actionable feedback | MEDIUM | All v2.0 signals in first/last 30s |
| Filler timing clusters by session segment | Reveals "you use fillers most in transitions" — behavioral pattern vs. raw count | LOW-MEDIUM | Whisper timestamps |
| WPM variance scoring (reward deliberate variation) | Identifies robotic vs. dynamic delivery beyond just average speed | LOW | WPM per-window data |

### Anti-Features for v2.0

| Feature | Why Requested | Why to Avoid | Alternative |
|---------|---------------|--------------|-------------|
| Syllables per minute (SPM) instead of WPM | More accurate metric per research | SPM is opaque to users; requires syllable counting algorithm | Use WPM for display; use SPM internally only if scoring needs higher precision — likely not needed |
| Real-time Whisper transcription (replace live captions) | Whisper is more accurate | Whisper.wasm runs 2-5x slower than real-time on base model; blocking the UI during recording is a non-starter | Keep Web Speech API for live; Whisper post-session only. This is explicitly in PROJECT.md |
| Sentiment analysis of opening hook quality | "Opening strength" could try to evaluate what the speaker said | NLP content evaluation is a separate, high-complexity problem; Whisper gives tokens, not semantics | Score opening strength entirely from delivery signals (rate, fillers, pauses, eye contact); avoid content-level analysis |
| Per-word filler confidence scores | Whisper can output logprobs; expose them | Adds complexity to the data model; users don't interpret confidence values; a word is either a filler or it's not | Binary filler classification; don't expose Whisper's internal logprobs |

---

## Feature Dependencies

```
[Webcam + Mic Recording]
    └──required-by──> [Session Playback]
    └──required-by──> [Eye Contact Tracking]
    └──required-by──> [Facial Expressiveness Scoring]
    └──required-by──> [Nervous Gesture Detection]
    └──required-by──> [Web Speech API Live Captions]    (mic only)
    └──required-by──> [Whisper.wasm Post-Session Audio] (audio blob)

[Web Speech API Live Captions]
    └──provides──> [Live transcript during recording]

[Whisper.wasm Post-Session Audio]
    └──required-by──> [Accurate Filler Counts]
    └──required-by──> [Filler Breakdown by Type]
    └──required-by──> [Filler Timing Clusters]
    └──required-by──> [Pause Analytics]
    └──required-by──> [Speaking Rate Variance Chart]
    └──required-by──> [Opening/Closing Strength Score]

[Pause Analytics]
    └──requires──> [Whisper.wasm word timestamps]
    └──requires──> [Sentence boundary detection]     (from transcript punctuation)
    └──feeds-into──> [Pacing Scorecard Dimension]
    └──feeds-into──> [Opening/Closing Strength]

[Speaking Rate Variance]
    └──requires──> [Whisper.wasm word timestamps]
    └──feeds-into──> [Pacing Scorecard Dimension]
    └──feeds-into──> [Opening/Closing Strength]

[Filler Breakdown]
    └──requires──> [Whisper.wasm word-level transcript]
    └──feeds-into──> [Filler Scorecard Dimension]
    └──feeds-into──> [Opening/Closing Strength]

[Opening/Closing Strength]
    └──requires──> [Whisper.wasm timestamps] (filler + pacing in segment)
    └──requires──> [Eye Contact Tracker]     (gaze ratio in segment)
    └──requires──> [Pause Analytics]         (pause events in segment)
    └──produces──> [New scorecard dimension]

[Post-Session Scorecard]
    └──requires──> [Eye Contact Tracking]
    └──requires──> [Filler Scorecard Dimension]    (now Whisper-derived)
    └──requires──> [Pacing Scorecard Dimension]    (now includes pause sub-dimension)
    └──requires──> [Facial Expressiveness Scoring]
    └──requires──> [Nervous Gesture Detection]
    └──requires──> [Opening/Closing Strength]      (v2.0 new dimension)
```

### Dependency Notes

- **Whisper.wasm is the v2.0 gating dependency:** All five new analytics features derive from Whisper word-level timestamps. Whisper must be integrated and producing reliable output before any of the other four features can be built. This creates a clear sequencing constraint: Whisper first, then analytics on top.
- **Opening/closing strength requires all other v2.0 signals:** It is the last feature to be completed because it aggregates from filler events, pause events, pacing data, and eye contact. It is the most dependent but also the most visible to users.
- **Session schema needs a version field before v2.0 launch:** Adding the opening/closing dimension to the scorecard changes the stored session structure. Existing sessions (v1.0) will lack this field. A `schema_version` field prevents the history view from crashing on old records.
- **Pause analytics requires sentence boundary detection from the Whisper transcript:** Distinguishing mid-clause from sentence-boundary pauses requires knowing where sentences end. Use punctuation in the Whisper output (Whisper does produce punctuation in its transcripts) to identify sentence boundaries.
- **Web Speech API live captions coexist with Whisper post-session:** These are independent pipelines. Web Speech API streams during recording for the live caption overlay; Whisper processes the audio blob after the user clicks Stop. They must not be conflated — the live captions are for UX feedback; the Whisper output is for analytics.

---

## MVP Definition

### v2.0 Launch (this milestone)

- [ ] Whisper.wasm integrated, running post-session on audio blob — gates everything else
- [ ] Filler scorecard dimension updated to use Whisper-derived counts
- [ ] Filler breakdown by type in review UI (per-type table)
- [ ] Pause count + avg duration in review UI (under Pacing)
- [ ] Pause scored as sub-dimension within Pacing scorecard card
- [ ] WPM-over-time chart in review UI (30s windows)
- [ ] Opening/closing strength as new scorecard dimension
- [ ] Session schema version field added before committing new sessions

### Add After v2.0 Validation

- [ ] Filler timing clusters by segment — add when users confirm they want to know *when* not just *how many*
- [ ] Pause markers on annotated timeline — the events already exist post-v2.0; rendering them on the timeline is a UI task
- [ ] WPM variance scoring component (reward deliberate variation) — add once the WPM chart is shipped and users confirm they understand the data
- [ ] Per-metric breakdown within opening/closing — useful, but the single combined score validates the concept first

### Defer (v3+)

- [ ] Real-time Whisper — technically infeasible in-browser without major latency trade-offs
- [ ] Content-level hook quality scoring — NLP semantic analysis; different complexity class entirely
- [ ] Multi-session trend for new v2.0 dimensions — once the dimensions are stable across several sessions

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
| **Whisper.wasm post-session transcription** | HIGH | HIGH | **P1 (v2.0)** |
| **Filler breakdown by type** | HIGH | LOW | **P1 (v2.0)** |
| **Pause analytics (scored sub-dimension)** | HIGH | MEDIUM | **P1 (v2.0)** |
| **WPM-over-time chart** | MEDIUM | LOW-MEDIUM | **P1 (v2.0)** |
| **Opening/closing strength dimension** | HIGH | MEDIUM | **P1 (v2.0)** |
| Timestamped transcript view | MEDIUM | LOW | P2 |
| Per-dimension trend charts | MEDIUM | MEDIUM | P2 |
| Filler timing clusters by segment | MEDIUM | LOW | P2 |
| Pause markers on annotated timeline | MEDIUM | LOW | P2 |
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
| Filler word detection | Yes | Yes | Yes | Yes | Yes — Whisper.wasm post-session for accuracy |
| Filler breakdown by type | No | No (aggregate only) | No (aggregate only) | No | Yes — per-type table (um/uh vs. discourse markers) |
| Pacing / WPM | Yes | Yes | Yes | Yes | Yes — derived from Whisper timestamps |
| WPM variance chart | Yes (rough graph) | No | No | No | Yes — 30s windows, inline range annotations |
| Pause analytics scored | No | No | No | No | Yes — sub-dimension with boundary vs. mid-clause classification |
| Opening/closing strength | No | No | No | No | Yes — new scorecard dimension |
| Eye contact | No | Yes (post-session stats) | Yes (stats) | Yes (VR) | Yes — MediaPipe iris landmarks, annotated on timeline |
| Facial expressiveness | No | No | No | Partial (smile detection) | Yes — MediaPipe blendshapes |
| Nervous gesture detection | No | No | No | Partial (VR body tracking) | Yes — MediaPipe Pose + Hand; highest difficulty |
| Annotated video timeline | No | No | No | No | Yes — core differentiator |
| Post-session scorecard | Yes | Yes | Yes | Yes | Yes |
| Session history | No | Yes (cloud) | Yes (cloud) | Yes (cloud) | Yes — local IndexedDB |
| Client-side / no upload | No (cloud) | No (cloud) | No (cloud) | No (cloud) | Yes — privacy differentiator |
| Browser-based, no install | Requires Office/web | Web (account required) | Mobile app | VR headset or web app | Yes — zero-install browser |

**v2.0 competitive gap note:** Filler breakdown by type, scored pause analytics (especially boundary vs. mid-clause distinction), and opening/closing strength as a dedicated scored dimension appear in none of the surveyed competitors. The WPM variance chart exists in Speaker Coach but only as an unscored visualization. This is where v2.0 differentiates.

---

## Sources

- [Orai — AI-powered app for practicing presentations](https://orai.com/)
- [Yoodli — AI Roleplay Platform for Communication Coaching](https://yoodli.ai/)
- [VirtualSpeech — Improve Eye Contact with VR Practice](https://virtualspeech.com/blog/practice-virtual-reality-improve-eye-contact)
- [Duarte — Can AI help with public speaking? Review of AI platforms](https://www.duarte.com/blog/review-of-public-speaking-ai-platforms/)
- [Speeko — AI Speech Coach for Public Speaking](https://www.speeko.co/)
- [PowerPoint Speaker Coach — Microsoft Support](https://support.microsoft.com/en-us/office/suggestions-from-speaker-coach-25e7d866-c895-4aa1-9b90-089b70a4ea38)
- [BoldVoice — 10 Best Public Speaking Apps 2025](https://boldvoice.com/blog/best-public-speaking-apps)
- [VocaFuse — Web Speech API vs Cloud APIs 2025](https://vocafuse.com/blog/web-speech-api-vs-cloud-apis/)
- [Roboflow — How to Build Real-Time Eye Tracking in the Browser](https://blog.roboflow.com/build-eye-tracking-in-browser/)
- [MediaPipe Face Landmarker — Google for Developers](https://developers.google.com/mediapipe/solutions/vision/face_detector)
- [New Features in PowerPoint's Presenter Coach (2025)](https://www.free-power-point-templates.com/articles/new-features-in-powerpoints-presenter-coach-2020/)
- [VirtualSpeech — Best Public Speaking Apps 2026](https://virtualspeech.com/learn/public-speaking-apps)
- [whisper.cpp WASM example — ggml.ai](https://ggml.ai/whisper.cpp/)
- [Offline speech recognition with Whisper: Browser implementation — AssemblyAI](https://www.assemblyai.com/blog/offline-speech-recognition-whisper-browser-node-js)
- [Distribution of Pauses (SpeechRater) — My Speaking Score](https://ai.myspeakingscore.com/distribution-of-pauses/)
- [SpeechRater Ultimate Guide — My Speaking Score](https://www.myspeakingscore.com/webflow/speechrater.html)
- [A Methodological Approach to Quantifying Silent Pauses — PMC 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11119743/)
- [Exploring optimal thresholds of silent pauses for L2 fluency — Gao et al. 2025, Sage Journals](https://journals.sagepub.com/doi/10.1177/02655322251315792)
- [Average Speaking Rate and Words per Minute — VirtualSpeech](https://virtualspeech.com/blog/average-speaking-rate-words-per-minute)
- [Ideal Public Speaking Words Per Minute — AmberWillo](https://www.amberwillo.com/public-speaking/words-per-minute/)
- [Automated Assessment of Public Speaking — ERIC/EJ 2016](https://files.eric.ed.gov/fulltext/EJ1126866.pdf)
- [How to Hook Audiences from the Start — Toastmasters 2025](https://www.toastmasters.org/magazine/magazine-issues/2025/november/how-to-hook-audiences-from-the-start)
- [Orai vs. Speeko: What to Know — Yoodli Blog](https://yoodli.ai/blog/orai-vs-speeko-what-to-know)

---
*Feature research for: browser-based presentation coaching app (v2.0 analytics)*
*Originally researched: 2026-03-12 | Updated for v2.0: 2026-03-16*
