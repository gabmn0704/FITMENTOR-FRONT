---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface brief: FitMentor app (all screens)

Mode: Operate (app screens: inicio, entrenar, progreso, rutina, logros, coach, perfil) with a Persuade-leaning access screen. Redesign: the lime/orange poster look is replaced.

Audience and job: people training with a phone or laptop propped 1 to 2 metres away; they read a count and a form score at a glance, then come back daily to see progress. Proof/content: only real product data; demonstration numbers labelled as example. Constraints: React/Vite, plain CSS, no paid assets, Spanish copy, prefers-reduced-motion respected.

## Direction contract

THESIS: Race day, not a dashboard. The product is a timed effort, so every number is a timing readout: digits roll into place like a stadium split-flap, and the week is read off a photo-finish strip. Refuses the dark-neon fitness dashboard with a lime accent and glow.

OWN-WORLD: Tyvek-white bib ground (cool, matte), ink black numerals, one committed race cobalt that owns the nav rail and the hero field, signal vermilion only for live, personal-best and error states. Tabbed bib tiles with punched corner holes and a perforated tear line; heavy condensed variable-width grotesk (Archivo wdth axis) for numerals; hairline timing rulers. Dark theme is the same world at night: ink ground, same cobalt and vermilion.

STORY: The visitor sees today's effort as a bib number, understands in a glance how many reps, how precise, how long the streak, and presses one button to start. Believes the system is exact because the digits are exact.

FIRST VIEWPORT: Left cobalt rail with logo, seven standard nav items, the active one marked by a sliding Tyvek tab. Main: a cobalt hero field with the greeting, "Hoy se entrena" at display scale in Tyvek white, the primary vermilion button "Entrenar ahora", and at right a bib tile holding today's weekly-goal number rolling up digit by digit. Under it four bib tiles (sesiones, repeticiones, precisión, kcal) whose digits roll in staggered, then a photo-finish strip of the week.

FORM: candidate 6 of my ordered list (race bib and photo-finish timing), after: stadium scoreboard, weightlifting plate colour code, Munich 1972 identity, track tartan and lane lines, climbing-gym route tape. seed: 19e9c8232f46be7c

SIGNATURE: Odometer digits (each digit a rolling column) on every number when data arrives, plus the photo-finish week strip with a timing ruler and a finish-line sweep on route change.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
