---
name: Podium
description: Practice coaching tool — record, review, improve your delivery
colors:
  bg: "#0C0C0B"
  surface: "#161614"
  surface-raised: "#1F1F1D"
  surface-hover: "#252523"
  accent: "#C8C8C8"
  accent-fg: "#0C0C0B"
  text-primary: "#FAFAF9"
  text-secondary: "#A8A29E"
  text-muted: "#78716C"
  border: "rgba(255,255,255,0.07)"
  border-hover: "rgba(255,255,255,0.12)"
  border-modal: "rgba(255,255,255,0.09)"
  success: "#10b981"
  warning: "#f59e0b"
  destructive: "#ef4444"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 8vw, 4rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.05em"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "3.5rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.05em"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.09em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 28px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 28px"
  button-primary-sm:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 16px"
  button-primary-lg:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.lg}"
    height: "50px"
    padding: "0 36px"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.xs}"
    padding: "4px 8px"
  button-destructive-sm:
    backgroundColor: "rgba(239,68,68,0.08)"
    textColor: "{colors.destructive}"
    rounded: "{rounded.sm}"
    height: "36px"
    padding: "0 16px"
  input-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
  session-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Podium

## 1. Overview

**Creative North Star: "The Signal Room"**

Podium is a focused coaching workspace for professionals who are serious about improving their delivery. The interface is built around one mandate: surface the signal, eliminate the noise. Every element either helps users understand their performance or gets out of the way. Nothing decorates. Nothing distracts.

The color system is deliberately warm and low-contrast at rest. Near-black charcoal surfaces carry a trace of warmth; the sole primary accent is a cream-white that reads as "ready" against the dark ground. This warmth is intentional: presenting is a human act, and the tool should acknowledge that without sentimentality. Data-heavy moments (scores, dimension bars, timeline markers) use a separate semantic color language that never bleeds into the interface chrome.

Motion is sparse. Entrances orient without choreography. Score animations build anticipation and deliver a small moment of release. The interface never moves unless it is communicating something.

**Key Characteristics:**
- Three neutral charcoal surfaces with consistent warm undertone -- no blue tints, no cool grays
- Cream-white primary CTA (`#F5F0EB`) -- restrained, reads as professional confidence rather than urgency
- Flat depth: structural layering via tonal surface shift + 1px borders, no decorative shadows
- Tight Inter at every scale, heavy letter-spacing contrast between display and label sizes
- Score semantics isolated from interface chrome: emerald / amber / red serve data, never decoration

## 2. Colors: The Warm Charcoal Palette

A restrained dark palette with just enough warmth to feel grounded, not cold.

### Primary
- **Neutral Gray** (`#C8C8C8`): The sole primary accent. CTA buttons, interactive highlights, primary affordances. Reads as precise and restrained against charcoal -- professional without warmth. Never used decoratively. Never as a score color.
- **Pure White** (`#FFFFFF`): Accent hover state only. A single step brighter than the resting accent.

### Neutral
- **Deep Charcoal** (`#0C0C0B`): Page background. The lowest surface. Marginally warm, less stark than true black.
- **Soft Charcoal** (`#161614`): Primary surface. Cards, panels, session list items, dialog backgrounds.
- **Raised Charcoal** (`#1F1F1D`): Elevated surface. Input backgrounds, hover containers, secondary panels.
- **Active Charcoal** (`#252523`): Hover/active state on surfaces. Used for in-line hover states.
- **Near-White** (`#FAFAF9`): Primary text. A warm near-white, not optical white.
- **Warm Stone** (`#A8A29E`): Secondary text. Metadata, supporting labels, secondary navigation.
- **Muted Stone** (`#78716C`): Tertiary text. Timestamps, captions, section label chrome.
- **Smoke Border** (`rgba(255,255,255,0.07)`): Standard 1px container border. Cards, section dividers, header rules.
- **Bright Border** (`rgba(255,255,255,0.12)`): Hover state border on interactive containers.
- **Modal Border** (`rgba(255,255,255,0.09)`): Slightly brighter border for dialog panels and inputs. Reads elevated without being loud.

### Semantic (score system)
- **Score Green** (`#10b981`): Good performance (overall ≥ 70). Emerald-500. Also success states and recording-safe indicators.
- **Score Amber** (`#f59e0b`): Mid performance (40–69). Also warning states, filler-word timeline markers, storage warnings.
- **Score Red** (`#ef4444`): Poor performance (< 40). Also destructive action states, the recording-in-progress indicator.

### Named Rules
**The Semantic Firewall Rule.** Score colors (emerald, amber, red) are a closed system. They appear on score numerics, dimension bars, timeline event markers, destructive buttons, and status indicators. They never appear as hover accents, icon tints, decorative borders, or interface chrome. The cream-white CTA is a separate closed system. The two never mix.

**The Warm Charcoal Rule.** Every neutral surface carries the same trace of warmth: `0C0C0B`, `161614`, `1F1F1D`. The last byte (blue channel) is always lower than the others -- a small but perceptible warmth. Cool gray (`#18181B`, `#1F2937`) is explicitly rejected. It reads as developer tool; warm charcoal reads as professional workspace.

## 3. Typography

**Display / Body Font:** Inter (system-ui, sans-serif fallback)
**Data / Numeric Font:** Inter with `font-variant-numeric: tabular-nums`

**Character:** A single-typeface system running the full range from logotype to label. Inter's geometric structure suits a data-focused tool; its optical warmth at smaller sizes avoids the coldness of pure geometric sans like DM Sans or Geist. The hierarchy is achieved entirely through weight contrast and letter-spacing -- not through type family switching.

### Hierarchy
- **Display** (700, clamp(2.5rem, 8vw, 4rem), line-height 1, -0.05em tracking): Product logotype on Home, hero moments only. Not a repeatable heading level.
- **Score Headline** (700, 3.5rem / 2.25rem / 1.5rem, -0.04 to -0.05em tracking, tabular-nums): Large numeric data outputs. Overall score, filler counts, session score in history cards. The number is the message.
- **Title** (600, 0.9375rem, -0.01em tracking): Page-level labels, session titles, primary header text. The readable midpoint.
- **Body** (400, 1rem, line-height 1.65): Descriptive copy, transcript text, callout prose. Cap at 65–75ch.
- **Small Body** (400–500, 13–14px, line-height 1.5): Panel copy, dimension detail strings, secondary content blocks.
- **Label** (600, 0.6875rem, 0.09em tracking, uppercase, `--color-text-muted`): Section dividers (`SCORECARD`, `FILLERS`, `TRANSCRIPT`). Maximum contrast in the smallest slot.

### Named Rules
**The Numeric Display Rule.** All score outputs use `font-weight: 700`, `font-variant-numeric: tabular-nums`, and letter-spacing between -0.04em and -0.05em. The number should feel weighty and precise. Never display a score in regular weight or with default tracking.

**The Section Label Rule.** Section headers are always `.section-label`: 0.6875rem, 600 weight, 0.09em tracking, uppercase, `--color-text-muted`. They orient without competing with the data below them. Increasing the weight, size, or color immediately breaks the hierarchy.

## 4. Elevation

This system is flat by default. Depth is created through three tonal surface levels and 1px borders -- not box shadows. The eye reads the difference between `#0C0C0B`, `#161614`, and `#1F1F1D` without needing simulated light.

The single exception is the dialog overlay: `box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6)`. Dialogs must float visibly above the document plane, and the deep shadow earns that elevation. Every other surface is shadow-free.

### Shadow Vocabulary
- **Dialog elevation** (`0 24px 64px rgba(0, 0, 0, 0.6)`): Modal panel only. The only box-shadow in the system. The blur radius is deliberately large (64px) for a cinematic, diffuse quality -- not a UI drop shadow.

### Named Rules
**The Flat-By-Default Rule.** If a card, panel, or input feels like it needs a shadow to read as distinct, the fix is a tonal background shift or a 1px border -- not a `box-shadow`. Adding shadows to non-dialog surfaces immediately breaks the depth hierarchy.

**The Three-Surface Rule.** Background (`--color-bg`) → Surface (`--color-surface`) → Raised Surface (`--color-surface-raised`). This is the complete elevation vocabulary. Nesting beyond three levels requires restructuring the layout, not adding another surface.

## 5. Components

### Buttons
One primary action per context. Everything else steps back.

- **Shape:** Gently curved. 10px radius (md), 8px (sm), 12px (lg).
- **Primary:** Warm Paper White background, Deep Charcoal text. 600 weight, -0.01em tracking. 44px height (md). Lifts 1px on hover (`translateY(-1px)`), scales down on press (`scale(0.98)`). 0.15s ease transitions.
- **Primary disabled:** 15% accent-opacity background, 35% accent-opacity text. No lift. Cursor: not-allowed.
- **Secondary:** 5% white background, 1px modal-border border, Warm Stone text. No lift. Background and border brighten slightly on hover.
- **Ghost:** No background, no border. Muted Stone text that shifts to Warm Stone on hover. Low-priority navigation only: "Back," "History," "View past sessions."
- **Destructive sm:** 8% red-tinted background, red text, red 20%-opacity border at rest. Floods to full `--color-destructive` background with white text on hover. Never the primary action on any screen.
- **Icon-muted:** No background, muted text, 5px radius. Shifts to destructive tint on hover. Used for inline delete actions.
- **Jump:** Compact (min-height 32px), 6px radius, 1px Smoke Border, Warm Stone text. Chevron or arrow icon shifts 2px right on hover.

### Session Cards
The primary browseable unit in History view.

- **Corner Style:** Gently curved (12px radius)
- **Background:** Soft Charcoal (`--color-surface`)
- **Shadow:** None
- **Border:** 1px Smoke Border at rest, brightens to Bright Border on hover via inline `onMouseEnter`/`onMouseLeave`
- **Internal Padding:** 20px
- **Score:** Tabular numerics, 2.25rem, 700 weight, semantic score color -- displayed in the card body, not in a badge
- **Delete action:** Positioned absolutely top-right, icon-muted style

### Inputs
- **Style:** Raised Charcoal background (`--color-surface-raised`), 1px Modal Border, 8px radius. No shadow.
- **Focus:** Border shifts to `rgba(245,240,235,0.25)` -- a warm ghost of the accent. Subtle; never a glow ring.
- **Typography:** 0.875rem, Near-White text, Muted Stone placeholder

### Dialogs
- **Overlay:** `rgba(0,0,0,0.70)` background with `backdrop-filter: blur(6px)`
- **Panel:** Soft Charcoal background, 1px Modal Border, 16px radius, dialog elevation shadow
- **Entrance:** `scale-in` keyframe (scale 0.96 → 1, opacity 0 → 1), 0.18s ease-out

### Progress / Score Bars
- **Height:** 3px -- intentionally narrow, data-dense
- **Track:** `rgba(255,255,255,0.07)` -- same visual weight as Smoke Border
- **Fill:** Semantic score color (emerald, amber, or red). Animates from 0% width on mount.
- **Transition:** `width 0.5s cubic-bezier(0.4,0,0.2,1)` with 60ms stagger per dimension
- **Radius:** Full pill (9999px)
- **Role:** `meter` ARIA role with `aria-valuenow/min/max`

### Annotated Timeline (Signature Component)
The core interactive surface in the Review view. An annotated scrubber that places event markers at their timestamp positions.

- **Container:** 40px tall, full-width, `cursor: pointer`, `userSelect: none`
- **Event markers:** Dots positioned absolutely by `(timestampMs / durationMs) * 100%`. Color-coded: amber for filler words, red for physical cues (face touch, body sway), Warm Stone for eye contact events, dark stone for pauses.
- **Tooltip:** Appears on marker hover, shows event label + formatted timestamp (MM:SS).
- **Seek:** Click anywhere on the track to jump playback to that position.

### Section Labels (Signature Pattern)
The repeating structural element that divides analysis panel content.

- 0.6875rem, 600 weight, 0.09em tracking, uppercase, `--color-text-muted`
- 14px bottom margin
- Applied via `.section-label` class throughout. Never deviate inline.

## 6. Do's and Don'ts

### Do:
- **Do** build depth using the three-surface tonal stack (`--color-bg` → `--color-surface` → `--color-surface-raised`) plus 1px Smoke Borders. This is the complete depth vocabulary.
- **Do** reserve `#C8C8C8` (Neutral Gray) for primary CTAs and primary interactive affordances exclusively. One primary button per context maximum.
- **Do** display all scores and numeric data with `font-weight: 700`, tight letter-spacing (-0.04em or tighter), and `font-variant-numeric: tabular-nums`. The number should feel precise and weighted.
- **Do** use `.section-label` (0.6875rem, 600, 0.09em tracking, uppercase, `--color-text-muted`) for all section headers in analysis panels. Never increase the weight or size.
- **Do** animate score bars from 0% width with staggered per-dimension delays (60ms). The anticipation during score reveal is a meaningful coaching moment.
- **Do** apply `box-shadow: 0 24px 64px rgba(0,0,0,0.6)` to dialog panels only. No other surface receives a shadow.
- **Do** run transitions at 0.15s ease for micro-interactions and 0.4–0.5s cubic-bezier(0.4,0,0.2,1) for data animations.
- **Do** keep all neutral surfaces warm: the blue channel in each surface hex is always lower than the red and green channels.

### Don't:
- **Don't** use blue-tinted navy surfaces. The system explicitly rejects blue-tinted neutrals and "raw analytics dashboard look (Bloomberg, Grafana)." Surfaces are warm charcoal -- never blue, never cool gray.
- **Don't** use gradient text (`background-clip: text`). Emphasis is achieved through weight, size, or the semantic score color system. Gradient text reads as AI-generated at a glance.
- **Don't** use glassmorphism decoratively. The dialog overlay blur is functional (it isolates the floating layer). Blur effects on cards, panels, or nav are forbidden.
- **Don't** use score colors (emerald, amber, red) as interface accents, hover states, or decorative borders. They are reserved for score outputs, status indicators, and timeline event markers.
- **Don't** add `box-shadow` to cards, inputs, panels, or containers. Tonal surfaces and 1px borders carry all depth.
- **Don't** use `border-left` or `border-right` greater than 1px as colored accents on cards or list items. Use a full border, background tint, or leading icon instead.
- **Don't** nest cards. Hierarchy inside a surface is expressed through whitespace, a `.section-label` divider, and a subtle rule -- not a card within a card.
- **Don't** introduce playful or gamified patterns: no streaks, achievement badges, confetti, or progress celebrations. This is a professional coaching tool. Honest signal is the reward.
- **Don't** use bounce, elastic, or spring easing. Ease-out only (`cubic-bezier(0.4,0,0.2,1)` or steeper). Motion is purposeful; physics metaphors are decorative.
