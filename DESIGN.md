---
name: FitMentor
description: Race day, not a dashboard. Every number is a timing readout on a Tyvek bib.
colors:
  tyvek-ground: "#e7eaee"
  bib-white: "#ffffff"
  tyvek-shade: "#f2f4f7"
  tyvek-crease: "#e1e5eb"
  hairline: "rgb(10 12 18 / 0.14)"
  hairline-strong: "rgb(10 12 18 / 0.28)"
  ink: "#0a0c12"
  ink-muted: "#434a59"
  ink-subtle: "#5b6272"
  race-cobalt: "#1b3bff"
  cobalt-deep: "#0d21c2"
  cobalt-wash: "rgb(27 59 255 / 0.1)"
  on-cobalt: "#f6f8ff"
  on-cobalt-muted: "#d9dfff"
  signal-vermilion: "#ff3d1f"
  signal-text: "#c42a0f"
  signal-wash: "rgb(255 61 31 / 0.12)"
  good-green: "#0a7a45"
typography:
  display:
    fontFamily: "Archivo, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(84px, 11.2vw, 8.5rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 62"
  headline:
    fontFamily: "Archivo, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(56px, 8vw, 6rem)"
    fontWeight: 900
    lineHeight: 0.86
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 62"
  numeral:
    fontFamily: "Archivo, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(72px, 7.4vw, 112px)"
    fontWeight: 900
    lineHeight: 1
    fontVariation: "'wdth' 62"
  title:
    fontFamily: "Archivo, Arial Narrow, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 850
    lineHeight: 0.92
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 68"
  body:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    letterSpacing: "0.1em"
rounded:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "24px"
  "6": "32px"
  "7": "48px"
  "8": "72px"
components:
  button-primary:
    backgroundColor: "{colors.signal-vermilion}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "48px"
  button-primary-large:
    backgroundColor: "{colors.signal-vermilion}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 32px"
    height: "58px"
  button-ghost:
    backgroundColor: "{colors.bib-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "48px"
  button-ghost-hover:
    textColor: "{colors.race-cobalt}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.signal-text}"
    rounded: "{rounded.sm}"
    padding: "0 24px"
    height: "48px"
  input:
    backgroundColor: "{colors.bib-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 16px"
    height: "48px"
  chip:
    backgroundColor: "{colors.tyvek-shade}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.xs}"
    padding: "5px 10px"
  chip-cobalt:
    backgroundColor: "{colors.cobalt-wash}"
    textColor: "{colors.race-cobalt}"
    rounded: "{rounded.xs}"
    padding: "5px 10px"
  card:
    backgroundColor: "{colors.bib-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  bib-tile-band:
    backgroundColor: "{colors.race-cobalt}"
    textColor: "{colors.on-cobalt}"
    typography: "{typography.label}"
    padding: "13px 18px 13px 44px"
  bib-tile-value:
    backgroundColor: "{colors.bib-white}"
    textColor: "{colors.ink}"
    typography: "{typography.numeral}"
    padding: "18px 18px 14px"
  nav-rail:
    backgroundColor: "{colors.race-cobalt}"
    textColor: "{colors.on-cobalt-muted}"
    width: "248px"
  nav-link-active:
    backgroundColor: "{colors.on-cobalt}"
    textColor: "{colors.race-cobalt}"
    rounded: "{rounded.sm}"
    height: "44px"
  segmented-active:
    backgroundColor: "{colors.race-cobalt}"
    textColor: "{colors.on-cobalt}"
    height: "38px"
---

# Design System: FitMentor

## Overview

**Creative North Star: "Race Day"**

FitMentor is dressed as a timed race, not a fitness dashboard. The ground is cool, matte Tyvek (the paper race bibs are printed on), the brand owns one committed race cobalt that floods the navigation rail and every hero field, and a single vermilion signal marks the moment to act, the live state, the personal best and the error. Numbers are the protagonists: set in Archivo pushed to its narrowest width and heaviest weight, they roll into place digit by digit like a split-flap board, and the week is read off a photo-finish strip of lanes with a timing ruler and a dashed finish line.

The surface is dense but legible at 1 to 2 metres: big condensed numerals, uppercase condensed headlines with tight leading, and a calm sans body at normal width. Materials are literal to the world: bib tiles with a colour band, two punched holes and a dashed tear line; hairline timing rulers along the bottom edge of cobalt fields; a perforated edge on the rail; duotone grayscale photography multiplied into cobalt. Dark theme is the same race at night: ink ground, same cobalt and vermilion, lifted text tones.

The world refuses the dark-neon fitness dashboard with a lime accent and glow. Light is the base theme; dark (chosen, or following the system) is the same world, never a different one.

**Key Characteristics:**
- Tyvek ground, white bib surfaces, ink numerals.
- One cobalt field per region: rail, hero, page banners, active controls.
- Vermilion is a signal, never decoration.
- Archivo variable: width 62 to 68% for display and numerals, 100% for body.
- Odometer digits on every number when data arrives.
- Bib tiles, timing rulers and photo-finish lanes as the recurring geometry.

## Colors

A cool paper-and-ink neutral set carrying one saturated cobalt and one hot vermilion signal.

### Primary
- **Race Cobalt** (`race-cobalt`): the brand field. Fills the navigation rail and mobile bottom bar, the home hero, page banners, the auth band, bib bands, rings, bars, lane bars, the active segmented and exercise options, the user's chat bubbles, selection. In dark theme it lifts slightly (#2a47ff) and its readable text form becomes #8a9dff.
- **Cobalt Deep** (`cobalt-deep`): the shadowed side of a cobalt field: hero photo panel, rail footer, access ticker.
- **Cobalt Wash** (`cobalt-wash`): tinted backgrounds for the current routine step, info notices, cobalt chips, input focus halo, search hover.
- **On Cobalt / On Cobalt Muted** (`on-cobalt`, `on-cobalt-muted`): text and the sliding active tab on cobalt fields; muted for inactive nav links and secondary copy on cobalt.

### Secondary
- **Signal Vermilion** (`signal-vermilion`): the primary action button (with ink text), the personal-best lane, the finish line, the weekly-goal fill inside the hero bib, unlocked achievements, the live dot, the route-change finish sweep, the chart target line, the text caret, error borders.
- **Signal Text** (`signal-text`): vermilion at text contrast for error copy, best-lane values, danger buttons, warn counters (#ff7d66 in dark).
- **Signal Wash** (`signal-wash`): error notices, fallback channel status, danger hover.

### Tertiary
- **Good Green** (`good-green`): success states only (#56d596 in dark).

### Neutral
- **Tyvek Ground** (`tyvek-ground`): page background, under a 5% multiply paper-noise texture.
- **Bib White** (`bib-white`): cards, tiles, inputs, ghost buttons, the hero bib.
- **Tyvek Shade / Tyvek Crease** (`tyvek-shade`, `tyvek-crease`): secondary surfaces (chips, routine items, settings, lane tracks) and tracks (bars, rings, switch).
- **Ink / Ink Muted / Ink Subtle** (`ink`, `ink-muted`, `ink-subtle`): numerals and body; labels and secondary copy; placeholders and axes.
- **Hairline / Hairline Strong** (`hairline`, `hairline-strong`): card inset borders, dividers; input and ghost borders, tear lines, ruler ticks.

### Named Rules
**The One Field Rule.** Cobalt is a field, not a highlight: it floods a whole region (rail, hero, banner, band, active control) or it is absent. Never thin cobalt accents sprinkled over white.

**The Signal Rule.** Vermilion means act, live, best or error. If an element is none of those, it is not vermilion.

## Typography

**Display Font:** Archivo variable (with Arial Narrow, system-ui), wdth 62..125, wght 100..900
**Body Font:** Archivo at normal width (with system-ui, Segoe UI)

**Character:** One family doing two jobs by its width axis: squeezed to 62% and 900 weight it is a bib number; at 100% and 400 it is quiet reading text.

### Hierarchy
- **Display** (900, clamp(84px, 11.2vw, 8.5rem), 0.86, wdth 62, uppercase): the home hero headline; the access title goes to 9.5rem at 0.84.
- **Headline** (900, clamp(56px, 8vw, 6rem), 0.86, wdth 62, uppercase): page banner titles. Plain page headers use clamp(44px, 5.2vw, 76px).
- **Numeral** (900, clamp(72px, 7.4vw, 112px), 1, wdth 62): bib tile values. The same face carries the live rep counter (up to 128px), hero bib (88px), stats (52px), lane values and ring centres (30 to 40px).
- **Title** (850, 30px, 0.92, wdth 68, uppercase, -0.015em, word-spacing 0.14em): card titles and all h2/h3; motivation strip and next-exercise lines use the same voice at 30 to 54px.
- **Body** (400, 16px, 1.5, wdth 100): reading text, max 60ch in page headers; chat bubbles 15.5px at 1.55.
- **Label** (800, 12px, 0.1em, uppercase): printed bib bands, lane day names (13px, 0.06em), bib labels and chat source lines (11 to 12px, 0.08em).

### Named Rules
**The Bib Number Rule.** Every quantity is set in the condensed numeral voice (wdth 62, 900) and rolls in through the odometer. A number set in body type is unfinished.

**The Two Widths Rule.** Width carries hierarchy: 62 to 75% for display, numerals and titles, 100% for everything read as sentences. Don't invent intermediate body widths.

## Layout

Desktop is a sticky cobalt rail (248px) beside a main column capped at 1280px with 24px / 32px / 72px padding and a 24px vertical rhythm between sections. Under 1024px the rail collapses to an 88px icon column; under 760px it disappears and a fixed cobalt bottom bar (68px plus safe area, five items) takes over. The home hero is a two-column cobalt field (1.12fr / 0.88fr, min 480px) with a clipped photo panel and an absolutely placed bib; it stacks under 760px with the photo first. Stats run four tiles across, two under 1024px. Card grids auto-fit at 260px minimum. Spacing follows the 4/8/12/16/24/32/48/72 scale; component gaps are mostly 12 to 16px.

## Elevation & Depth

Hybrid and restrained: surfaces sit on the ground with a soft long shadow plus a 1px inset hairline; cobalt fields and floating panels get a deeper, cobalt-tinted shadow. Depth also comes from material cues (punched holes with an inset shadow, the dashed tear line, the multiply paper texture) rather than stacked layers.

### Shadow Vocabulary
- **Resting bib** (`--shadow-1` plus inset 1px hairline): cards, tiles, motivation strip.
- **Lifted field** (`--shadow-2`): cobalt hero and banners, auth bib form, search popover, tile hover.
- **Punched hole** (`inset 0 2px 3px rgb(0 0 0 / 0.3-0.35)`): the circular holes on bands and the hero bib.
- **Focus** (`--focus`: 3px ground gap, 2px cobalt ring): every keyboard focus.

### Named Rules
**The Paper Not Glass Rule.** Depth is paper on a table: soft drop plus hairline. Blur is reserved for overlays on camera and modals.

## Shapes

Gently squared: 8px for controls, 12px for inner panels and the hero bib, 16px for cards, tiles and fields; 2 to 4px for bars, chips, switch, markers. Bullets, dots and markers are small rounded squares (2px), never circles; circles are reserved for punched bib holes. Recurring geometry: dashed 2px tear line between a bib's band and its value; timing ruler (long tick every 56px, short ticks between) along the bottom of cobalt fields; perforated dot column on the rail's edge; diagonal clip on the hero photo panel.

## Components

### Buttons
Tactile and decisive.
- **Shape:** 8px radius, 48px tall (58px large), 15px/700 (17px large).
- **Primary:** vermilion with ink text and a vermilion-tinted drop; hover lifts 2px with a light sheen sweeping across; press scales to 0.97.
- **Ghost:** bib white with a 1.5px strong hairline; hover turns border and text cobalt.
- **Danger:** transparent with a 1.5px vermilion border and signal text; hover fills with signal wash.

### Chips
- **Style:** 4px radius, 12px/700, Tyvek shade with hairline; cobalt variant on cobalt wash.
- **State:** coach suggestions are 36px bib-white chips with a strong border, lifting 2px and turning cobalt on hover.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** bib white; secondary rows (routine, settings) on Tyvek shade with a hairline, 12px radius.
- **Shadow Strategy:** resting bib (see Elevation).
- **Internal Padding:** 24px; title row 16px above content.

### Inputs / Fields
- **Style:** 48px, 8px radius, 1.5px strong hairline on bib white; labels 13px/700 muted.
- **Focus:** border turns cobalt with a 4px cobalt-wash halo.
- **Error:** signal-wash notice with a vermilion border and a short shake.

### Navigation
Cobalt rail with muted on-cobalt links (700). The active item sits on a sliding on-cobalt tab (44px, 460ms drawer ease) and its text turns cobalt. Mobile: cobalt bottom bar, active item is an on-cobalt block. Segmented controls and auth tabs follow the same pattern: cobalt pill sliding under on-cobalt text.

### Bib Tile (signature)
A white card with a colour band on top (cobalt or ink), a punched hole at the band's left, a 2px dashed tear line, and a giant condensed numeral below. Tiles drop in staggered (90ms) with a slight rotation, then their digits roll. Hover lifts 5px and tilts 0.5deg. The hero bib and the auth form are the same object at other sizes.

### Odometer (signature)
Each digit is a column of 0 to 9 translated by a 1.1em cell over 1250ms (700ms for live readouts), with per-digit stagger; suffixes sit at 0.62em. Reduced motion drops the roll.

### Photo-Finish Lanes (signature)
One lane per day: day label, track on Tyvek shade with a cobalt bar (vermilion for the best day), value in the numeral voice at right. A ruler above (major tick every 10%), a dashed vermilion finish line, bars running in at 80ms stagger.

## Do's and Don'ts

### Do:
- **Do** flood whole regions with race cobalt and put on-cobalt text on them.
- **Do** set every quantity in Archivo at wdth 62 / 900 and roll it in through the odometer.
- **Do** build new data containers as bib tiles: band, punched hole, dashed tear line, numeral.
- **Do** keep vermilion for the primary action, live, personal best, finish and error.
- **Do** use 2px-radius squares for bullets, dots and markers.
- **Do** run entrances and hovers on transform and opacity (chart strokes may draw via dash offset), gate hovers behind `(hover: hover) and (pointer: fine)`, and honour `prefers-reduced-motion`.

### Don't:
- **Don't** drift toward the dark-neon fitness dashboard: no lime, no neon glow, no separate night palette (dark keeps the same cobalt and vermilion).
- **Don't** use vermilion as a decorative accent or second brand colour.
- **Don't** set numbers in body width or regular weight.
- **Don't** add a second accent hue; green is success only.
