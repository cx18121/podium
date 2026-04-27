## Design Context

### Users
Professionals and presenters using Podium to practice and improve their delivery. They record a session, receive annotated video playback with ML-derived scores, and track improvement over time. They open the app focused and purposeful — they want signal, not distraction. They're self-motivated, data-literate, and pressed for time.

### Brand Personality
**Clean, Precise, Sleek.**

Podium is a no-nonsense coaching tool. It gives simple, easy-to-action feedback without ceremony. The interface is a polished, focused workspace — it feels well-made and considered at every detail, without drawing attention to itself.

### Aesthetic Direction

**Color System — Near-black + Sky Blue**
| Role | Color | Hex |
|------|-------|-----|
| Background | Near-black neutral | `#0F0F11` |
| Surface | Dark gray | `#1A1A1C` |
| Surface raised | Hover / active | `#232326` |
| Accent | Sky blue | `#0EA5E9` |
| Accent hover | Sky blue light | `#38BDF8` |
| Accent glow | Sky blue 18% | `rgba(14,165,233,0.18)` |
| Text primary | Near-white | `#F4F4F5` |
| Text secondary | Cool gray | `#A1A1AA` |
| Text muted | Dark gray | `#52525B` |
| Score good (≥70) | Emerald-500 | `#10b981` |
| Score mid (40–69) | Amber-400 | `#fbbf24` |
| Score bad (<40) | Red-500 | `#ef4444` |
| Border subtle | White 6% | `rgba(255,255,255,0.06)` |
| Border hover | White 10% | `rgba(255,255,255,0.10)` |

**Theme:** Dark-only. No light mode planned.

**References:** Linear (minimal, clean dark UI, premium feel) + Vercel dashboard (precise, focused, no noise).

**Anti-references:** Avoid blue-tinted navy palettes, raw analytics dashboard look (Bloomberg, Grafana), CLI tool aesthetics, playful/gamified interfaces. Surfaces must be neutral gray — never blue-tinted.

### Design Principles

1. **Calm signal, no noise.** Every element earns its place. Reduce cognitive load at every turn.

2. **Three surfaces, consistent depth.** Background → surface → raised. Hierarchy through layering and subtle borders, not box-shadow stacking. Surfaces are neutral gray — depth should feel structural, not decorative.

3. **Motion as communication.** Animations are purposeful — entrance animations orient, transitions maintain context, micro-interactions confirm actions. Never animate for spectacle alone.

4. **Human warmth in a data-heavy product.** The interface acknowledges there's a real person practicing something they care about. Score displays, feedback moments, and empty states should feel encouraging, not clinical.

5. **Sky blue owns CTA, semantics own score.** `#0EA5E9` is reserved for primary CTAs, interactive highlights, and progress bars. Score colors (emerald / amber / red) are a separate semantic system — never use them decoratively.

### Accessibility
Best-effort. Avoid obvious failures. No hard WCAG target. Sighted-user focus, with keyboard navigation where straightforward.
