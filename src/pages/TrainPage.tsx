import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import "../styles/training-voice.css";
import { ArrowRight, Keyboard, Pause, Play, RefreshCw, SkipForward, Square, Undo2, Wifi, WifiOff } from "lucide-react";
import { Button, Notice, ProgressRing } from "../components/ui";
import { CameraStage } from "../components/training/CameraStage";
import { ExercisePicker } from "../components/training/ExercisePicker";
import { ExerciseGuide } from "../components/training/ExerciseGuide";
import { CoachCue, type CoachCueState } from "../components/training/CoachCue";
import { VoiceControls } from "../components/training/VoiceControls";
import { RestTimer } from "../components/training/RestTimer";
import { SessionSummary } from "../components/training/SessionSummary";
import { Sparkline } from "../components/charts/Sparkline";
import { Odometer } from "../components/motion/Odometer";
import { loadGsap, useGsap } from "../components/motion/useGsap";
import { useAuth } from "../hooks/useAuth";
import { useRealtime } from "../hooks/useRealtime";
import { preloadPoseDetector, currentDelegate } from "../hooks/usePoseDetector";
import { useVoiceCommands } from "../hooks/useVoiceCommands";
import type { VoiceCommand } from "../lib/voiceCommands";
import { useTrainingSession, type AnalysisMode, type FinishedSession } from "../hooks/useTrainingSession";
import { EXERCISES, EXERCISE_LIST, exerciseLabel } from "../lib/exercises";
import { formatDuration } from "../lib/format";
import { serverStateLabel } from "../lib/contract";
import { readLocalSessions, saveLocalSession, syncPendingSessions } from "../lib/sessions";
import { CATALOG, catalogLabel, type CatalogId } from "../lib/catalog";
import { EXERCISE_ART } from "../lib/exerciseArt";
import { takePendingExercise } from "../lib/pendingExercise";
import type { RouteId } from "../lib/routes";
import type { SessionPayload } from "../types";

const PHASE_LABEL: Record<string, string> = {
  ready: "Preparado",
  up: "Arriba",
  down: "Bajando",
  bottom: "Abajo",
  hold: "Sosteniendo",
};

/** Texto de estado del canal en vivo según quién analiza la sesión. */
function channelText(mode: AnalysisMode, reconnecting: boolean, serverState: string | undefined): string {
  if (reconnecting) return "Sin conexión con el servidor. Reintentando… mientras tanto el análisis sigue en tu dispositivo.";
  const state = serverState ? ` · ${serverState}` : "";
  switch (mode) {
    case "ai":
      return `IA del servidor conectada: cuenta tus reps y corrige tu técnica${state}.`;
    case "fallback":
      return `Servidor conectado, IA no disponible: las reps se cuentan en tu dispositivo${state}.`;
    case "silent":
      return "El servidor no responde a la postura: análisis en tu dispositivo.";
    case "pending":
      return `Servidor conectado. Esperando el análisis de la IA${state}.`;
    default:
      return "Modo local: el análisis funciona sin conexión y la sesión se guarda en tu dispositivo.";
  }
}

/** Convierte el resumen de la sesión al payload que acepta el backend. */
function toPayload(summary: FinishedSession): SessionPayload {
  return {
    exercise: summary.exercise,
    reps: summary.reps,
    accuracy: summary.accuracy,
    durationSeconds: summary.durationSeconds,
    ...(summary.avgAngles ? { avgAngles: summary.avgAngles } : {}),
  };
}

interface TrainPageProps {
  onNavigate: (route: RouteId) => void;
}

export function TrainPage({ onNavigate }: TrainPageProps) {
  const { token } = useAuth();
  const realtime = useRealtime(token);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const session = useTrainingSession({ realtime, video, canvas });
  const [saving, setSaving] = useState(false);
  // Variante del plan (p. ej. sentadilla sumo) que la cámara mide con el ejercicio base.
  const [variant, setVariant] = useState<CatalogId | null>(null);

  // Descarga y calienta el modelo de pose mientras el usuario lee la pantalla: "Comenzar" queda casi inmediato.
  useEffect(() => {
    preloadPoseDetector();
  }, []);

  useEffect(() => {
    const pending = takePendingExercise();
    if (pending) {
      session.actions.selectExercise(pending.engine);
      setVariant(pending.variant);
    }
    // Solo al abrir la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Comandos de voz: se ejecutan con el estado más reciente de la sesión (el listener es persistente). */
  const onVoiceCommand = (command: VoiceCommand) => {
    const { actions, status, finished } = session;
    switch (command) {
      case "start":
      case "resume":
        if (status === "idle" || status === "paused") void actions.start();
        else actions.speak(status === "running" ? "Ya estamos entrenando." : "Un momento, empezamos.");
        break;
      case "pause":
        if (status === "running") actions.pause();
        else actions.speak("No hay una serie en curso.");
        break;
      case "next":
        void goNext();
        break;
      case "finish":
        if (status !== "idle") {
          const summary = actions.finish();
          actions.speak(summary ? "Sesión terminada. Di guardar para guardarla." : "Sesión terminada.");
        } else actions.speak("No hay una sesión activa.");
        break;
      case "save":
        if (finished) void save(finished);
        else actions.speak("No hay una sesión por guardar.");
        break;
      case "repeat":
        actions.repeatLast();
        break;
      case "status":
        actions.reportStatus();
        break;
      case "undo":
        actions.speak(actions.undo() ? "Repetición deshecha." : "No hay repeticiones que deshacer.");
        break;
      case "mute":
        actions.setVoiceEnabled(false);
        break;
      case "unmute":
        actions.setVoiceEnabled(true);
        break;
    }
  };
  const commands = useVoiceCommands({ onCommand: onVoiceCommand, shouldIgnore: session.isCoachSpeaking });

  const meta = EXERCISES[session.exercise];
  const guideId: CatalogId = variant && CATALOG[variant].engine === session.exercise ? variant : session.exercise;
  const busy = session.status !== "idle";
  const progress = Math.min(100, Math.round((session.reps / meta.target) * 100));

  /** Guarda primero en local (nunca se pierde) y luego intenta subir al backend. */
  const save = async (summary: FinishedSession) => {
    setSaving(true);
    saveLocalSession(toPayload(summary));
    if (token) await syncPendingSessions(token);
    session.actions.dismissSummary();
    setSaving(false);
    onNavigate("progreso");
  };

  /** Pasa al siguiente ejercicio; si hay una serie activa la guarda antes, sin pasar por el resumen. */
  const goNext = async () => {
    const { actions, status } = session;
    if (status !== "idle") {
      const summary = actions.finish();
      if (summary) {
        saveLocalSession(toPayload(summary));
        if (token) void syncPendingSessions(token);
        actions.dismissSummary();
      }
    }
    const index = EXERCISE_LIST.findIndex((item) => item.id === session.exercise);
    const next = EXERCISE_LIST[(index + 1) % EXERCISE_LIST.length]!;
    actions.selectExercise(next.id);
    setVariant(null);
    actions.speak(`Siguiente ejercicio: ${next.label}. Di iniciar cuando estés listo.`);
  };

  const coachState: CoachCueState = session.speaking
    ? "speaking"
    : commands.enabled && commands.state === "listening"
      ? "listening"
      : "idle";


  const root = useRef<HTMLElement>(null);
  const countRef = useRef<HTMLDivElement>(null);
  const lastReps = useRef(session.reps);
  const unit = meta.unit === "seconds" ? "segundos" : "repeticiones";
  const exerciseIndex = EXERCISE_LIST.findIndex((item) => item.id === session.exercise);
  const remaining = Math.max(0, meta.target - session.reps);

  // Resumen del día: sesiones y repeticiones guardadas hoy, para saber cuánto falta sin salir de la cabina.
  const today = useMemo(() => {
    const now = new Date();
    const sameDay = (iso: string) => {
      const d = new Date(iso);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    };
    const sessions = readLocalSessions().filter((item) => sameDay(item.date));
    return {
      sessions: sessions.length,
      reps: sessions.reduce((sum, item) => sum + (item.reps ?? 0), 0),
      seconds: sessions.reduce((sum, item) => sum + (item.durationSeconds ?? 0), 0),
    };
    // Se recalcula al cerrar un resumen (una sesión pudo guardarse).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.finished, session.exercise]);

  /** Siguiente acción clara según el estado: lo que conviene hacer ahora, en una frase. */
  const nextStep =
    session.status === "idle"
      ? `Ponte frente a la cámara y pulsa Comenzar, o di "iniciar". Meta: ${meta.target} ${unit}.`
      : session.status === "loading" || session.status === "countdown"
        ? "Colócate de cuerpo completo dentro del encuadre."
        : session.status === "paused"
          ? `Serie en pausa. Te faltan ${remaining} ${unit}. Di "reanudar" para seguir.`
          : remaining > 0
            ? `Te faltan ${remaining} ${unit}. Mantén la técnica antes que la velocidad.`
            : "Meta alcanzada. Termina la serie o di \"siguiente\" para pasar al próximo ejercicio.";

  // Atajos de teclado: espacio inicia o pausa, Z deshace, F termina, N pasa al siguiente. Se ignoran al escribir.
  const keys = useRef({ session, goNext });
  keys.current = { session, goNext };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      const { session: current, goNext: next } = keys.current;
      const key = event.key.toLowerCase();
      if (key === " ") {
        event.preventDefault();
        if (current.status === "running") current.actions.pause();
        else if (current.status === "idle" || current.status === "paused") void current.actions.start();
      } else if (key === "z" && current.canUndo) current.actions.undo();
      else if (key === "f" && current.status !== "idle") current.actions.finish();
      else if (key === "n") void next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Entrada de la cabina: titular por palabras, paneles que se destapan en cascada y mazo de ejercicios al desplazar.
  useGsap(
    root,
    ({ gsap, ScrollTrigger, reduce }) => {
      if (reduce) return;
      const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.1 } });
      tl.from(".cockpit-head [data-word]", { yPercent: 110, stagger: 0.07 })
        .from(".cockpit-head [data-fade]", { y: 18, opacity: 0, stagger: 0.06, duration: 0.8 }, "<0.15")
        .from(
          ".cockpit-grid > *",
          { clipPath: "inset(100% 0% 0% 0%)", y: 28, stagger: 0.07, duration: 1.2, clearProps: "clipPath,transform" },
          "<0.1",
        );
      ScrollTrigger.batch(".deck-tile", {
        start: "top 92%",
        once: true,
        onEnter: (batch) =>
          gsap.from(batch, { y: 56, opacity: 0, stagger: 0.06, duration: 0.9, ease: "expo.out", clearProps: "transform,opacity" }),
      });
      const ghost = root.current?.querySelector(".cockpit-guide__ghost");
      if (ghost) {
        gsap.fromTo(
          ghost,
          { yPercent: 18 },
          { yPercent: -18, ease: "none", scrollTrigger: { trigger: ".cockpit-guide", start: "top bottom", end: "bottom top", scrub: true } },
        );
      }
    },
    [],
  );

  // Cada repetición nueva golpea el contador: rebote corto y un destello; sin movimiento si se pidió menos.
  useEffect(() => {
    const previous = lastReps.current;
    lastReps.current = session.reps;
    const el = countRef.current;
    if (!el || session.reps <= previous) return;
    if (typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void loadGsap()
      .then(({ gsap }) => {
        gsap.fromTo(el.querySelector(".cockpit-count__num"), { scale: 1.14 }, { scale: 1, duration: 0.7, ease: "back.out(3)" });
        gsap.fromTo(el.querySelector(".cockpit-count__flash"), { opacity: 0.9 }, { opacity: 0, duration: 0.9, ease: "power2.out" });
      })
      .catch(() => undefined);
  }, [session.reps]);

  return (
    <section className="cockpit" aria-labelledby="train-title" ref={root}>
      <header className="cockpit-head">
        <div className="cockpit-head__title">
          <span className="cockpit-eyebrow" data-fade>
            <span className={`cockpit-eyebrow__dot ${session.status === "running" ? "is-live" : ""}`} aria-hidden="true" />
            Entrenar · {String(exerciseIndex + 1).padStart(2, "0")} / {String(EXERCISE_LIST.length).padStart(2, "0")}
          </span>
          <h1 id="train-title" className="cockpit-title">
            {meta.label.split(" ").map((word, index) => (
              <span className="cockpit-title__mask" key={`${word}-${index}`}>
                <span data-word>{word}</span>
              </span>
            ))}
            <span className="cockpit-title__mask">
              <span data-word className="cockpit-title__live">
                en vivo
              </span>
            </span>
          </h1>
        </div>
        <div className="cockpit-head__side" data-fade>
          <p className="cockpit-head__lede">
            La IA analiza tu técnica y te corrige en tiempo real. Solo se envían puntos de postura, nunca el video.
          </p>
          <dl className="cockpit-today" aria-label="Resumen de hoy">
            <div>
              <dt>Sesiones hoy</dt>
              <dd className="tabular">{today.sessions}</dd>
            </div>
            <div>
              <dt>Reps hoy</dt>
              <dd className="tabular">{today.reps}</dd>
            </div>
            <div>
              <dt>Tiempo activo</dt>
              <dd className="tabular">{formatDuration(today.seconds)}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="cockpit-grid">
        <div className="cockpit-stage">
          <CameraStage
            videoRef={video}
            canvasRef={canvas}
            status={session.status}
            countdown={session.countdown}
            elapsed={session.elapsed}
            voiceOn={session.voiceOn}
            onToggleVoice={session.actions.toggleVoice}
            formatTime={formatDuration}
            reps={session.reps}
            target={meta.target}
            score={session.score}
          />

          {session.error && (
            <div className="cockpit-stage__error">
              <Notice tone="error">{session.error}</Notice>
            </div>
          )}

          <div className="cockpit-controls">
            <p className="cockpit-next" aria-live="polite">
              <ArrowRight size={16} aria-hidden="true" />
              <span>{nextStep}</span>
            </p>
            <div className="cockpit-controls__row" role="group" aria-label="Controles de sesión">
              {session.status === "running" ? (
                <Button variant="ghost" onClick={session.actions.pause} icon={<Pause size={16} />}>
                  Pausar
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => void session.actions.start()}
                  loading={session.status === "loading"}
                  disabled={session.status === "countdown"}
                  icon={session.status === "loading" ? undefined : <Play size={16} fill="currentColor" />}
                >
                  {session.status === "paused" ? "Reanudar" : "Comenzar análisis"}
                </Button>
              )}
              <Button variant="ghost" onClick={() => session.actions.undo()} disabled={!session.canUndo} icon={<Undo2 size={16} />}>
                Deshacer rep
              </Button>
              <Button variant="ghost" onClick={() => void goNext()} icon={<SkipForward size={16} />}>
                Siguiente
              </Button>
              <Button variant="danger" onClick={() => session.actions.finish()} disabled={!busy} icon={<Square size={14} fill="currentColor" />}>
                Terminar
              </Button>
            </div>
            <p className="cockpit-keys" aria-label="Atajos de teclado">
              <Keyboard size={14} aria-hidden="true" />
              <span><kbd>Espacio</kbd> iniciar o pausar</span>
              <span><kbd>Z</kbd> deshacer</span>
              <span><kbd>N</kbd> siguiente</span>
              <span><kbd>F</kbd> terminar</span>
            </p>
          </div>
        </div>

        <div
          className="cockpit-panel cockpit-count"
          ref={countRef}
          style={{ "--p": `${progress}%` } as CSSProperties}
          aria-label={`${session.reps} de ${meta.target} ${unit}`}
          role="group"
        >
          <span className="cockpit-count__flash" aria-hidden="true" />
          <span className="cockpit-label">{meta.unit === "seconds" ? "Segundos" : "Repeticiones"}</span>
          <div className="cockpit-count__num tabular" aria-live="polite">
            <Odometer value={session.reps} stagger={0} />
          </div>
          <div className="cockpit-count__foot">
            <span className="tabular">
              meta <b>{meta.target}</b>
            </span>
            <span className="tabular">{progress}%</span>
          </div>
          <span className="cockpit-count__bar" aria-hidden="true" />
        </div>

        <div className="cockpit-panel cockpit-coach">
          <div className="cockpit-coach__score">
            <ProgressRing value={session.score} size={104} stroke={9} label={`Precisión ${session.score} por ciento`}>
              <strong>
                <Odometer value={session.score} stagger={0} />
              </strong>
              <span>precisión</span>
            </ProgressRing>
            <div className="cockpit-coach__trend">
              <span className="cockpit-label">Precisión reciente</span>
              <Sparkline values={session.trend} label="Tendencia de precisión reciente" />
            </div>
          </div>
          <CoachCue state={coachState} message={session.cue} />
        </div>

        <div className="cockpit-panel cockpit-rest">
          <span className="cockpit-label">Descanso</span>
          <RestTimer seconds={60} />
        </div>

        <div className="cockpit-panel cockpit-voice">
          <span className="cockpit-label">Entrenador por voz</span>
          <VoiceControls
            voiceOn={session.voiceOn}
            volume={session.volume}
            onToggleVoice={session.actions.toggleVoice}
            onVolume={session.actions.setVolume}
            commandsSupported={commands.supported}
            commandsEnabled={commands.enabled}
            listenState={commands.state}
            heard={commands.heard}
            onToggleCommands={commands.toggle}
          />
        </div>

        <div className="cockpit-panel cockpit-telemetry">
          <span className="cockpit-label">Telemetría</span>
          <dl className="telemetry">
            <div>
              <dt>Fase</dt>
              <dd>{PHASE_LABEL[session.repPhase] ?? session.repPhase}</dd>
            </div>
            <div>
              <dt>Ángulo</dt>
              <dd className="tabular">{session.angle !== null ? `${session.angle}°` : "--"}</dd>
            </div>
            <div>
              <dt>Inferencia</dt>
              <dd className="tabular">
                {session.inferMs !== null && session.status === "running"
                  ? `${session.inferMs} ms${currentDelegate() ? ` · ${currentDelegate()}` : ""}`
                  : "--"}
              </dd>
            </div>
          </dl>
          <p
            className={`channel-status channel-status--${realtime.reconnecting ? "retry" : session.analysisMode}`}
            role="status"
          >
            {realtime.reconnecting ? (
              <RefreshCw size={15} aria-hidden="true" className="spin" />
            ) : realtime.connected ? (
              <Wifi size={15} aria-hidden="true" />
            ) : (
              <WifiOff size={15} aria-hidden="true" />
            )}
            <span>{channelText(session.analysisMode, realtime.reconnecting, serverStateLabel(realtime.serverState))}</span>
          </p>
        </div>
      </div>

      <section className="cockpit-deck" aria-labelledby="deck-title">
        <header className="cockpit-deck__head">
          <div>
            <span className="cockpit-label">Movimientos con cámara</span>
            <h2 id="deck-title">Elige el ejercicio</h2>
          </div>
          <div className="cockpit-search">
            <ExercisePicker value={session.exercise} disabled={busy} onChange={session.actions.selectExercise} />
          </div>
        </header>
        {busy && <p className="cockpit-deck__note">Termina la sesión para cambiar de ejercicio.</p>}
        <div className="deck-row" role="group" aria-label="Ejercicios">
          {EXERCISE_LIST.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="deck-tile"
              aria-pressed={item.id === session.exercise}
              disabled={busy}
              onClick={() => {
                session.actions.selectExercise(item.id);
                setVariant(null);
              }}
            >
              <img src={EXERCISE_ART[item.id]} alt="" decoding="async" />
              <span className="deck-tile__index tabular">{String(index + 1).padStart(2, "0")}</span>
              <span className="deck-tile__body">
                <strong>{item.label}</strong>
                <span className="tabular">
                  Meta {item.target} {item.unit === "seconds" ? "s" : "reps"}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="cockpit-guide" aria-labelledby="guide-title">
        <div className="cockpit-guide__aside">
          <span className="cockpit-guide__ghost tabular" aria-hidden="true">
            {String(exerciseIndex + 1).padStart(2, "0")}
          </span>
          <span className="cockpit-label">Técnica</span>
          <h2 id="guide-title">Cómo se hace: {catalogLabel(guideId)}</h2>
          {guideId !== session.exercise && (
            <Notice tone="info">
              Hoy te toca {catalogLabel(guideId).toLowerCase()}. La cámara la mide como {meta.label.toLowerCase()}.
            </Notice>
          )}
        </div>
        <div className="cockpit-guide__body">
          <ExerciseGuide exercise={guideId} />
        </div>
      </section>

      {session.finished && (
        <SessionSummary
          session={session.finished}
          saving={saving}
          saved={false}
          onSave={() => void save(session.finished!)}
          onDiscard={session.actions.dismissSummary}
        />
      )}
    </section>
  );
}
