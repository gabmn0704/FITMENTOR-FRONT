---
name: FitMentor
description: Tinta, esmeralda y lima. Datos que se leen a distancia, sin personajes ni adornos.
colors:
  ink: "#0A0E13"
  brand: "#0A7A53"
  brand-bright: "#19E3A1"
  signal: "#D4FF3A"
  surface-light: "#FFFFFF"
  ground-light: "#EEF1EF"
  surface-dark: "#0E1217"
  ground-dark: "#07090C"
  danger: "#C8283A"
  warn: "#9A5B00"
typography:
  display: "Outfit Variable"
  body: "Geist Variable"
---

# Design System: FitMentor (v2)

## Overview
FitMentor corrige la técnica con la cámara y se usa a 1-2 metros de la pantalla, a veces con luz variable. El sistema prioriza lectura a distancia y datos reales. No hay personajes ni frases de personaje: donde hubo uno hay cifras, gráficos o estados vacíos con una acción clara.

Dos temas con la misma paleta: oscuro (escenario principal, tinta casi negra) y claro (verde-gris muy tenue). El tema "sistema" sigue al dispositivo.

## Marca
- Logo: una F de corte inclinado (velocidad hacia adelante) con una flecha de progreso al lado, sobre baldosa oscura `#0A0E13` y degradado esmeralda `#19E3A1` a lima `#D4FF3A`. Fuente única en `public/logo.svg`; `public/logo-mark.svg` es la marca sin baldosa.
- Componente `src/brand/Logo.tsx`: `<LogoMark>` (solo marca) y `<Logo>` (marca + "FitMentor" en Outfit 700/400). Animación única al montar (la F se asienta, la flecha sube), desactivada con `prefers-reduced-motion`.
- Iconos: `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png` (180, sin esquinas), `icon-192/512.png`, `icon-maskable-512.png`, `manifest.webmanifest`.

## Color
Tokens en `src/styles/tokens.css`.
- `--brand` (esmeralda): selección, datos, estados activos. En claro `#0A7A53` (texto blanco, 5:1); en oscuro `#19E3A1` con texto tinta (`--on-brand`).
- `--signal` (lima): acción principal (botón primario), récord y "en vivo". Siempre con texto tinta `--signal-ink`. En claro, el texto lima sobre blanco usa `--signal-text` (`#4D6B00`).
- `--danger`: errores y acciones destructivas. Nunca se reutiliza el lima para errores.
- `--on-ink`: texto sobre campos de tinta (riel, portada, acceso); no usar `--on-brand` ahí.
- Fotografías en `public/img` siempre bajo degradado de tinta cuando llevan texto encima.

## Tipografía
Outfit Variable para títulos y cifras (peso 600-700, tracking -0.03em), Geist Variable para cuerpo. Escala fluida `--fs-*`. Cifras siempre `tabular-nums`. Medida de párrafo 65-75ch.

## Layout y componentes
- Bento de tarjetas planas: una tarjeta nunca contiene otra tarjeta; los subgrupos se separan con filas, líneas finas o espacio.
- `PageHero`: título en dos líneas, lead y, a la derecha, `aside` con datos reales (`HeroWeek` con repeticiones por día, `HeroFigures` con cifras clave).
- Inicio: héroe con foto y panel "pulso de hoy" (racha, repeticiones de hoy, meta semanal), meta semanal en anillo, combustible del día, racha, nivel y retos.
- Entrenar: escenario de cámara, cifra de repeticiones grande, `CoachCue` (indicación en vivo en texto grande, con icono de estado de voz) y telemetría.
- Acceso: escena oscura con foto, esqueleto de postura y tres cifras de confianza (33 puntos, 0 videos que salen, 5 ejercicios).

## Movimiento
GSAP, una entrada por pantalla (titulares en máscara, cifras que ruedan con `Odometer`), `expo.out`. Todo se apaga con `prefers-reduced-motion`. Sin animaciones continuas decorativas.

## Accesibilidad
Foco visible con anillo `--focus`; contraste mínimo 4.5:1 en texto; objetivos táctiles de 44 px; barra inferior en móvil; `aria-live` en la indicación del entrenador.

## Don't
- No reintroducir personajes ni frases en primera persona de una marca-personaje.
- No usar degradados de texto, tarjetas anidadas ni sombras duras.
- No usar lima para errores ni esmeralda sobre fondos claros con texto blanco por debajo de 4.5:1.
