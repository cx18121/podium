## Design Context

### Users
Professionals and presenters using Podium to practice and improve their delivery. They record a session, receive annotated video playback with ML-derived scores, and track improvement over time. They open the app focused and purposeful — they want signal, not distraction. They're self-motivated, data-literate, and pressed for time.

### Brand Personality
**Precise, Calm, Professional.**

Podium is the trusted coach in your corner. It doesn't celebrate you or scold you — it gives you the truth clearly and calmly. The interface is a neutral, focused workspace that gets out of the way and lets the data speak.

### Aesthetic Direction

**Color System — Slate + Indigo**
| Role | Color | Hex |
|------|-------|-----|
| Background | Deep blue-slate | `#080c14` |
| Surface | Elevated panels | `#0f1629` |
| Surface raised | Hover / active | `#14203a` |
| Accent | Indigo-500 | `#6366f1` |
| Accent hover | Indigo-400 | `#818cf8` |
| Text primary | Slate-100 | `#f1f5f9` |
| Text secondary | Slate-400 | `#94a3b8` |
| Text muted | Slate-600 | `#475569` |
| Score good (≥70) | Emerald-500 | `#10b981` |
| Score mid (40–69) | Amber-400 | `#fbbf24` |
| Score bad (<40) | Red-500 | `#ef4444` |
| Border subtle | White 6% | `rgba(255,255,255,0.06)` |
| Border hover | White 10% | `rgba(255,255,255,0.10)` |

**Theme:** Dark-only. No light mode planned.

**References:** Loom (approachable, video-centric warmth) + Framer (motion-forward, premium, slick animations).

**Anti-references:** Avoid raw analytics dashboard look (Bloomberg, Grafana), CLI tool aesthetics, playful/gamified interfaces.

### Design Principles

1. **Calm signal, no noise.** Every element earns its place. Reduce cognitive load at every turn.

2. **Three surfaces, consistent depth.** Background → surface → raised. Hierarchy through layering and subtle borders, not box-shadow stacking.

3. **Motion as communication.** Animations are purposeful — entrance animations orient, transitions maintain context, micro-interactions confirm actions. Never animate for spectacle alone.

4. **Human warmth in a data-heavy product.** The interface acknowledges there's a real person practicing something they care about. Score displays, feedback moments, and empty states should feel encouraging, not clinical.

5. **Indigo owns CTA, semantics own score.** Indigo-500 is reserved for primary CTAs and interactive highlights. Score colors (emerald / amber / red) are a separate semantic system — never use them decoratively.

### Accessibility
Best-effort. Avoid obvious failures. No hard WCAG target. Sighted-user focus, with keyboard navigation where straightforward.
