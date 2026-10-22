# FitMentor Frontend

Aplicación web de entrenamiento con corrección de postura por IA. La cámara se analiza en el navegador con MediaPipe Pose; solo viajan al backend los puntos de postura, nunca el video.

![Pantalla de acceso en escritorio](docs/screenshots/login-desktop.png)

![Pantalla de acceso en móvil](docs/screenshots/login-mobile.png)

## Qué incluye

| Pantalla | Qué hace |
| --- | --- |
| **Acceso** | Login con Google (Identity Services) o entrada como invitado. |
| **Inicio** | Saludo, racha, meta semanal con anillo, rutina de hoy, sugerencia y logros destacados. |
| **Entrenar** | Cámara con esqueleto neón, cuenta regresiva 3-2-1, conteo de repeticiones, precisión, voz, deshacer, descanso y resumen con confeti. |
| **Progreso** | Barras semanales, línea de precisión y reparto por ejercicio. Gráficos SVG propios. |
| **Rutina IA** | Plan adaptativo con la razón del plan y carrusel de ejercicios. |
| **Logros** | Insignias con progreso. |
| **Coach IA** | Chat con sugerencias rápidas. Las respuestas recientes se cachean. |
| **Perfil** | Nombre, nivel, objetivo, voz, tema (oscuro, claro o sistema) y cierre de sesión. |

En móvil la navegación va en una barra inferior; en escritorio, en una barra lateral.

## Requisitos

- Node.js 22 o superior (CI usa Node 22).
- La cámara requiere HTTPS o `localhost`.

## Cómo correr el proyecto

```bash
npm ci
cp .env.example .env.local   # en Windows: copy .env.example .env.local
npm run dev                  # http://localhost:5173
```

Scripts disponibles:

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite. |
| `npm run build` | Compila con `tsc -b` y empaqueta con Vite en `dist/`. |
| `npm test` | Ejecuta las pruebas unitarias y de componentes con Vitest. |
| `npm run test:watch` | Pruebas en modo observación. |
| `npm run preview` | Sirve el build de producción en local. |

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `VITE_API_URL` | No | URL base del backend. En desarrollo, por defecto `http://localhost:8080`. En producción vacía significa mismo origen. |
| `VITE_GOOGLE_CLIENT_ID` | No | Client ID de Google. Si falta, se oculta el botón de Google y queda solo el acceso como invitado. |

Las variables `VITE_*` se incrustan en el build. No pongas secretos en ellas.

## Contrato con el backend

- `POST /api/auth/google`, `POST /api/auth/guest`: devuelven `{ token, user }`.
- Con `Authorization: Bearer <token>`: `/api/me`, `/api/sessions`, `/api/stats`, `/api/routine`, `/api/achievements`, `/api/exercises`, `/api/coach`.
- WebSocket nativo en `${VITE_API_URL}/ws?token=<jwt>` (`ws`/`wss` según el protocolo). Envía mensajes `pose` (máximo tres por segundo, doce landmarks) y `command` (`pause`, `resume`, `skip`, `finish`, `undo`). Recibe `feedback` y `state`. Reconecta con backoff exponencial.
- Sin conexión, el análisis local sigue funcionando. Las sesiones se guardan en `localStorage` y se sincronizan al volver a entrar.

## Estructuras de datos

Implementadas en `src/structures/` con uso real y pruebas en `src/structures/structures.test.ts`.

| Estructura | Uso en la app |
| --- | --- |
| `Stack` | Deshacer repeticiones durante una sesión. |
| `Queue` | Cola de mensajes de voz para que nunca se solapen (`src/lib/speech.ts`). |
| `SinglyLinkedList` | Carrusel de la rutina del día (siguiente y vuelta al inicio). |
| `DoublyLinkedList` + `ListCursor` | Historial de sesiones con anterior y siguiente. |
| `CircularBuffer` | Ventana móvil para suavizar el ángulo y la gráfica de precisión en vivo. |
| `Trie` | Autocompletado del buscador de ejercicios (ignora tildes y mayúsculas). |
| `MinHeap` | Cola de prioridad para sugerir el siguiente ejercicio (`src/lib/suggest.ts`). |
| `LRUCache` | Caché de respuestas del API con TTL (ejercicios y coach). |

## Estructura del código

```
src/
  App.tsx               Contenedor: auth, rutas por hash y páginas
  main.tsx              Punto de entrada; aplica el tema antes del primer render
  components/
    ui/                 Primitivos: Button, Card, ProgressRing, Switch, Segmented...
    layout/             AppShell: barra lateral y barra inferior móvil
    charts/             BarChart, LineChart, Sparkline (SVG propio)
    training/           CameraStage, ExercisePicker, RestTimer, SessionSummary
  pages/                Una página por ruta
  hooks/                useAuth, useRealtime, useTrainingSession, useTheme...
  lib/                  API, servicios tipados, pose, voz, sesiones, rutas, formato
  structures/           Estructuras de datos y su caché
  styles/               tokens, base, components, layout, pages (un archivo por área)
```

## Diseño y accesibilidad

- Tema oscuro por defecto con acentos lima y naranja. Tipografía Space Grotesk e Inter.
- Tokens CSS en `src/styles/tokens.css`; el tema claro se activa con `data-theme="light"`.
- Foco visible en teclado, etiquetas ARIA en controles, enlace de salto al contenido, regiones en vivo para el feedback.
- `prefers-reduced-motion` desactiva animaciones y el confeti.
- Diseño responsive: barra lateral en escritorio, barra inferior en móvil, respeto de la zona segura del dispositivo.

## Despliegue en Netlify

1. Conecta el repositorio en Netlify. `netlify.toml` ya define el comando (`npm run build`), la carpeta de publicación (`dist`) y la redirección de SPA.
2. En **Site configuration > Environment variables** define `VITE_API_URL` (URL pública del backend) y, si usas Google, `VITE_GOOGLE_CLIENT_ID`.
3. Añade el dominio de Netlify a los orígenes autorizados del cliente de Google.

## Integración continua

`.github/workflows/ci.yml` ejecuta en cada push a `main` y en cada pull request: `npm ci`, `npm run build` y `npm test`.

## Capturas

Las capturas de acceso están en `docs/screenshots/`. Las pantallas autenticadas necesitan un backend activo para mostrar datos reales; cuando esté disponible, añade capturas de Inicio, Entrenar y Progreso en esa misma carpeta.

## Notas y pendientes

- El backend no está en este repositorio. Varias pantallas dependen de sus respuestas: `/api/achievements` debe devolver `progress` entre 0 y 1 (o entre 0 y 100; el front normaliza ambos casos).
- Las pruebas cubren estructuras, lógica de pose, voz, sesiones, rutas y el flujo de acceso. El análisis de cámara y MediaPipe se valida manualmente en un navegador con cámara.
