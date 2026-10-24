# Product

<!-- impeccable:product-schema 1 -->

> Hechos inferidos del repositorio y de la petición del usuario (sin entrevista: pidió avanzar sin interrupciones). Marcados como "inferido" donde corresponde.

## Platform

web

## Stack
React 18 + Vite + TypeScript, CSS plano (sin Tailwind), lucide-react. Despliegue en Vercel (main). Backend Java/Spring en Render, IA en FastAPI.

## Users
Personas que entrenan en casa o en el gimnasio con el celular o la laptop apoyados enfrente, a veces sudadas, con luz variable y a distancia de 1 a 2 metros de la pantalla (inferido). Estudiantes de la materia Patrones de Software como evaluadores de la entrega.

## Product Purpose
FitMentor mide la postura con la cámara (MediaPipe, en el dispositivo), cuenta repeticiones, calcula una precisión de técnica y da correcciones en vivo. Incluye rutina por nivel, progreso, logros y un coach de IA conversacional. Éxito: que la persona entrene mejor y vuelva mañana.

## Positioning
La cámara nunca sube el video: el análisis ocurre en el dispositivo y solo se guardan números. Corrección de técnica en tiempo real, no solo contador de repeticiones.

## Operating Context
Pantallas de app (inicio, entrenar con cámara, progreso, rutina IA, logros, coach, perfil) más una pantalla de acceso. Se usa a diario, en sesiones cortas; el entrenamiento en vivo exige lectura a distancia.

## Capabilities and Constraints
Funcionalidad que debe conservarse: login por correo, Google e invitado; sesión de entrenamiento con cámara y STOMP; estadísticas; rutina; logros; coach IA con respaldo local; tema oscuro/claro; barra inferior en móvil. Sin dependencias de pago. Todo el texto en español.

## Brand Commitments
Nombre FitMentor, logotipo en `src/brand/Logo.tsx`, fotos en `public/img` (cuerdas, estudio, gimnasio, peso muerto, core). El usuario pidió explícitamente: animaciones ricas, números que se animan al aparecer los datos, "el diseño web más profesional posible", colores y estilo nuevos (el actual le parece casi igual a antes).

## Evidence on Hand
Fotografías en `public/img/*.jpg`. No hay testimonios, clientes ni cifras comerciales: no inventarlos. Los datos de demostración deben marcarse como de ejemplo.

## Product Principles
1. Cada dato se gana su aparición: los números cuentan, ruedan o se dibujan cuando llegan.
2. Legible a distancia durante el entrenamiento; la expresión nunca estorba a la corrección.
3. La privacidad es parte del producto, no una nota al pie.
4. Esfuerzo visible: racha, precisión y progreso se sienten como logros.

## Accessibility & Inclusion
Respetar `prefers-reduced-motion`, contraste AA, foco visible y navegación por teclado.
