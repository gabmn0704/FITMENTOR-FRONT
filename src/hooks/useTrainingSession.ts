import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import { Stack, CircularBuffer } from "../structures";
import { EXERCISES } from "../lib/exercises";
import { cameraErrorMessage, openCamera, stopStream } from "../lib/camera";
import {
  analyzePose,
  AngleSmoother,
  LandmarkSmoother,
  RepCounter,
  coachingCue,
  SKELETON_EDGES,
  type RepPhase,
} from "../lib/pose";
import { createBrowserVoice, VoicePriority, type BrowserVoice, type VoiceCoach } from "../lib/speech";
import { briefSpoken, CueGate, spanishNumber, praiseForRep, repCallout, restCallout, statusReport } from "../lib/voiceScript";
import { STORAGE_KEYS, storage } from "../lib/storage";
import { toRepPhase, type ServerPhase } from "../lib/realtime";
import { loadPoseDetector, reloadPoseDetectorOnCpu } from "./usePoseDetector";
import type { RealtimeStatus } from "./useRealtime";
import type { CommandName, ExerciseId, FeedbackMessage, Point, SessionPayload } from "../types";

export type TrainingStatus = "idle" | "loading" | "countdown" | "running" | "paused";

/**
 * Quién analiza la sesión:
 * - "local": sin conexión; el navegador cuenta y corrige.
 * - "pending": conectado, esperando el primer feedback del servidor.
 * - "ai": la IA del servidor cuenta reps y fase.
 * - "fallback": el servidor responde pero la IA no (phase null): reps locales.
 * - "silent": conectado pero sin respuestas del servidor: todo local.
 */
export type AnalysisMode = "local" | "pending" | "ai" | "fallback" | "silent";
type ServerMode = Exclude<AnalysisMode, "local">;

/** Tras este tiempo corriendo sin ningún feedback, el análisis local toma el control. */
const SERVER_SILENCE_MS = 1_500;
/** Si la IA del servidor deja de responder este tiempo en plena sesión, el análisis local retoma conteo y avisos. */
const SERVER_STALE_MS = 2_500;
/** Ánimo si el entrenador lleva este rato sin hablar durante la serie. */
const IDLE_CHEER_MS = 25_000;
const IDLE_CHEERS = ["Vas muy bien, sigue así.", "Mantén el ritmo y respira.", "Buen trabajo, no pierdas la técnica."];

/** Espacio mínimo entre inferencias; se adapta a la velocidad real del equipo. */
const MIN_DETECT_INTERVAL_MS = 40;
const MAX_DETECT_INTERVAL_MS = 120;
const TREND_SIZE = 40;
const COUNTDOWN_SECONDS = 3;

export interface TrainingRealtime {
  status: RealtimeStatus;
  connected: boolean;
  /** Verdadero si el servidor cuenta reps y fase de la sesión activa. */
  serverCounting: boolean;
  feedback: FeedbackMessage | null;
  startSession: (sessionId: string) => void;
  endSession: () => void;
  sendPose: (exercise: ExerciseId, landmarks: Point[], frameWidth: number, frameHeight: number) => boolean;
  sendCommand: (name: CommandName) => boolean;
}

export interface FinishedSession extends SessionPayload {
  score: number;
}

/** UUID v4 por sesión de entrenamiento; cae a un generador equivalente sin crypto.randomUUID. */
export function newSessionId(): string {
  const webCrypto: Crypto | undefined = typeof crypto !== "undefined" ? crypto : undefined;
  if (webCrypto && typeof webCrypto.randomUUID === "function") return webCrypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (webCrypto && typeof webCrypto.getRandomValues === "function") webCrypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface Options {
  realtime: TrainingRealtime;
  video: RefObject<HTMLVideoElement>;
  canvas: RefObject<HTMLCanvasElement>;
}

/** Lógica completa de una sesión: cámara, IA, conteo, deshacer, voz y resumen. */
export function useTrainingSession({ realtime, video, canvas }: Options) {
  const [exercise, setExercise] = useState<ExerciseId>("squat");
  const [status, setStatus] = useState<TrainingStatus>("idle");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(0);
  const [angle, setAngle] = useState<number | null>(null);
  const [repPhase, setRepPhase] = useState<RepPhase | ServerPhase>("ready");
  const [serverMode, setServerMode] = useState<ServerMode>("pending");
  const [cue, setCue] = useState("Activa la cámara para comenzar.");
  const [elapsed, setElapsed] = useState(0);
  const [trend, setTrend] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [finished, setFinished] = useState<FinishedSession | null>(null);
  const [voiceOn, setVoiceOn] = useState(() => storage.getString(STORAGE_KEYS.voice) !== "off");
  const [volume, setVolumeState] = useState(() => {
    const raw = storage.getString(STORAGE_KEYS.voiceVolume);
    const saved = raw === null ? 1 : Number(raw);
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 1;
  });
  const [speaking, setSpeaking] = useState(false);
  /** Latencia media de la inferencia de pose en ms (diagnóstico). */
  const [inferMs, setInferMs] = useState<number | null>(null);

  const browserVoice = useRef<BrowserVoice | null>(null);
  if (!browserVoice.current) browserVoice.current = createBrowserVoice(volume);
  const voice = useRef<VoiceCoach>(browserVoice.current.coach);
  voice.current.onSpeakingChange = setSpeaking;

  const stream = useRef<MediaStream | null>(null);
  const detector = useRef<PoseLandmarker | null>(null);
  const frame = useRef<number | null>(null);
  const lastDetect = useRef(0);
  const statusRef = useRef<TrainingStatus>("idle");
  const exerciseRef = useRef<ExerciseId>("squat");
  const phaseRef = useRef<RepPhase>("ready");
  const repsRef = useRef(0);
  /** Reps según el servidor (absolutas), reps contadas en local y reps deshechas. */
  const serverRepsRef = useRef(0);
  const localRepsRef = useRef(0);
  const undoneRef = useRef(0);
  const serverModeRef = useRef<ServerMode>("pending");
  const runningSince = useRef<number | null>(null);
  /** Reps contadas en local, para deshacerlas en orden LIFO. */
  const undoStack = useRef(new Stack<number>());
  const smoother = useRef(new AngleSmoother());
  const landmarkSmoother = useRef(new LandmarkSmoother());
  const repCounter = useRef(new RepCounter("squat"));
  const cueGate = useRef(new CueGate());
  const lastFeedbackAt = useRef(0);
  const lastVideoTime = useRef(-1);
  const inferAvg = useRef(0);
  const inferFrames = useRef(0);
  const detectErrors = useRef(0);
  const cpuFallback = useRef(false);
  const idleCheerIndex = useRef(0);
  const setCompleteSpoken = useRef(false);
  /** Reps ya contadas en local antes de que la IA del servidor respondiera: se suman al conteo absoluto del servidor. */
  const serverOffsetRef = useRef(0);
  const scoreWindow = useRef(new CircularBuffer<number>(TREND_SIZE));
  const kneeSum = useRef({ total: 0, count: 0 });
  const sessionId = useRef<string>("");
  const activeMs = useRef(0);
  const lastTick = useRef<number | null>(null);
  const timerId = useRef<number | null>(null);
  const countdownId = useRef<number | null>(null);
  const scoreSum = useRef({ total: 0, count: 0 });
  const realtimeRef = useRef(realtime);
  realtimeRef.current = realtime;
  /** Falso tras desmontar: las operaciones asíncronas en vuelo no deben seguir. */
  const alive = useRef(true);

  const setStatusBoth = useCallback((next: TrainingStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const setServerModeBoth = useCallback((next: ServerMode) => {
    if (serverModeRef.current === next) return;
    serverModeRef.current = next;
    setServerMode(next);
  }, []);

  /** Reps visibles: servidor + locales - deshechas (nunca negativas). */
  const syncReps = useCallback((): number => {
    const total = Math.max(0, serverRepsRef.current + serverOffsetRef.current + localRepsRef.current - undoneRef.current);
    repsRef.current = total;
    setReps(total);
    return total;
  }, []);

  const resetCounters = useCallback(() => {
    repsRef.current = 0;
    serverRepsRef.current = 0;
    serverOffsetRef.current = 0;
    localRepsRef.current = 0;
    undoneRef.current = 0;
    runningSince.current = null;
    lastFeedbackAt.current = 0;
    setCompleteSpoken.current = false;
    cueGate.current.reset();
    landmarkSmoother.current.reset();
    repCounter.current = new RepCounter(exerciseRef.current);
    serverModeRef.current = "pending";
    setServerMode("pending");
    phaseRef.current = "ready";
    undoStack.current.clear();
    smoother.current.reset();
    scoreWindow.current.clear();
    kneeSum.current = { total: 0, count: 0 };
    scoreSum.current = { total: 0, count: 0 };
    activeMs.current = 0;
    setReps(0);
    setRepPhase("ready");
    setAngle(null);
    setScore(0);
    setElapsed(0);
    setTrend([]);
  }, []);

  const stopLoop = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const stopTimers = useCallback(() => {
    if (timerId.current !== null) window.clearInterval(timerId.current);
    if (countdownId.current !== null) window.clearInterval(countdownId.current);
    timerId.current = null;
    countdownId.current = null;
    lastTick.current = null;
  }, []);

  const drawSkeleton = useCallback(
    (points: Point[]) => {
      const c = canvas.current;
      const v = video.current;
      const ctx = c?.getContext("2d");
      if (!c || !v || !ctx) return;
      c.width = v.videoWidth || 640;
      c.height = v.videoHeight || 480;
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = "#f4f6fb";
      ctx.fillStyle = "#ff3d1f";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      for (const [a, b] of SKELETON_EDGES) {
        if (!points[a] || !points[b]) continue;
        ctx.beginPath();
        ctx.moveTo(points[a].x * c.width, points[a].y * c.height);
        ctx.lineTo(points[b].x * c.width, points[b].y * c.height);
        ctx.stroke();
      }
      for (const p of points) {
        if ((p.visibility ?? 1) < 0.45) continue;
        ctx.beginPath();
        ctx.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [canvas, video],
  );

  /** Cuenta en voz alta: el número manda sobre cualquier otro aviso; ánimo y descanso al final de la serie. */
  const announceRep = useCallback((total: number) => {
    const { target, unit } = EXERCISES[exerciseRef.current];
    voice.current.say(repCallout(total, target, unit), { force: true, priority: VoicePriority.count });
    cueGate.current.noteSpoken(performance.now());
    if (unit === "reps" && total >= target && !setCompleteSpoken.current) {
      setCompleteSpoken.current = true;
      voice.current.say(restCallout(60), { force: true, priority: VoicePriority.form });
      return;
    }
    const praise = praiseForRep(total, target);
    if (praise) voice.current.say(praise, { force: true, priority: VoicePriority.chatter });
  }, []);

  const registerRep = useCallback(() => {
    localRepsRef.current += 1;
    undoStack.current.push(localRepsRef.current);
    announceRep(syncReps());
  }, [announceRep, syncReps]);

  /** Registra una puntuación en el resumen y en la tendencia reciente. */
  const recordScore = useCallback((value: number) => {
    scoreSum.current.total += value;
    scoreSum.current.count += 1;
    scoreWindow.current.push(value);
    setScore(value);
    setTrend(scoreWindow.current.toArray());
  }, []);

  const detectOnce = useCallback(
    (now: number) => {
      const v = video.current;
      const det = detector.current;
      if (!v || !det || v.readyState < 2) return;
      // Un frame de video sin cambios no aporta nada: no gastamos inferencia.
      if (v.currentTime === lastVideoTime.current) return;
      lastVideoTime.current = v.currentTime;
      const currentExercise = exerciseRef.current;
      const t0 = performance.now();
      const raw = det.detectForVideo(v, now).landmarks?.[0] ?? [];
      const took = performance.now() - t0;
      inferAvg.current = inferAvg.current ? inferAvg.current * 0.9 + took * 0.1 : took;
      if (++inferFrames.current % 25 === 0) setInferMs(Math.round(inferAvg.current));
      detectErrors.current = 0;
      const points = landmarkSmoother.current.smooth(raw);
      realtimeRef.current.sendPose(currentExercise, points, v.videoWidth || 16, v.videoHeight || 9);
      drawSkeleton(points);

      // Sin feedback a tiempo (nunca llegó, o dejó de llegar), el servidor no está analizando: pasa a local.
      const connected = realtimeRef.current.serverCounting;
      if (connected && runningSince.current !== null) {
        const mode0 = serverModeRef.current;
        if (mode0 === "pending" && performance.now() - runningSince.current > SERVER_SILENCE_MS) {
          setServerModeBoth("silent");
        } else if ((mode0 === "ai" || mode0 === "fallback") && performance.now() - lastFeedbackAt.current > SERVER_STALE_MS) {
          setServerModeBoth("silent");
        }
      }
      const mode: AnalysisMode = connected ? serverModeRef.current : "local";
      // Con la IA del servidor activa, ella es la fuente de verdad para reps y fase.
      const countLocally = mode === "local" || mode === "fallback" || mode === "silent";
      // El consejo y la puntuación vienen del servidor siempre que responda.
      const coachLocally = mode === "local" || mode === "silent";

      const data = analyzePose(points, currentExercise);
      if (!data) {
        if (coachLocally) setCue("Buscando una pose completa y estable...");
        return;
      }
      const movement = data.movementAngle;
      const smoothed = movement === null ? null : smoother.current.push(movement);
      if (smoothed !== null) {
        setAngle(Math.round(smoothed));
        // Sin IA del servidor el análisis local cuenta las repeticiones (sin doble conteo).
        if (countLocally) {
          // Histéresis + duración mínima: cuenta al volver arriba y nunca dos veces.
          const update = repCounter.current.update(smoothed, now);
          if (update.changed) {
            phaseRef.current = update.phase;
            setRepPhase(update.phase);
          }
          if (update.completed) registerRep();
        }
      }
      if (data.knee !== null) {
        kneeSum.current.total += data.knee;
        kneeSum.current.count += 1;
      }
      // Avisos hablados: la corrección local sale al instante aunque la IA del servidor tarde o no responda.
      const issue = data.issues?.[0] ?? null;
      const spoken = cueGate.current.consider(issue, now);
      if (spoken) {
        voice.current.say(spoken, { force: true, priority: VoicePriority.form });
      } else if (!issue && voice.current.msSinceSpoke() > IDLE_CHEER_MS && now - lastFeedbackAt.current > IDLE_CHEER_MS) {
        const cheer = IDLE_CHEERS[idleCheerIndex.current++ % IDLE_CHEERS.length]!;
        voice.current.say(cheer, { force: true, priority: VoicePriority.chatter });
      }

      if (!coachLocally) return;

      recordScore(data.score);
      setCue(coachingCue(currentExercise, data));
    },
    [drawSkeleton, recordScore, registerRep, setServerModeBoth, video],
  );

  const loop = useCallback(
    (time: number) => {
      if (statusRef.current !== "running") return;
      const interval = Math.min(MAX_DETECT_INTERVAL_MS, Math.max(MIN_DETECT_INTERVAL_MS, inferAvg.current * 1.5));
      if (time - lastDetect.current >= interval) {
        lastDetect.current = time;
        try {
          detectOnce(performance.now());
        } catch (err) {
          console.error(err);
          // Si el delegate GPU falla en plena sesión, pasamos a CPU una sola vez.
          if (++detectErrors.current >= 3 && !cpuFallback.current) {
            cpuFallback.current = true;
            reloadPoseDetectorOnCpu()
              .then((next) => {
                detector.current = next;
                detectErrors.current = 0;
              })
              .catch(() => setError("La IA de postura dejó de responder. Recarga la página."));
          }
        }
      }
      frame.current = requestAnimationFrame(loop);
    },
    [detectOnce],
  );

  const startTimers = useCallback(() => {
    stopTimers();
    lastTick.current = performance.now();
    timerId.current = window.setInterval(() => {
      const now = performance.now();
      if (lastTick.current !== null) activeMs.current += now - lastTick.current;
      lastTick.current = now;
      setElapsed(Math.floor(activeMs.current / 1000));
    }, 250);
  }, [stopTimers]);

  const beginRunning = useCallback(() => {
    if (runningSince.current === null) runningSince.current = performance.now();
    lastFeedbackAt.current = performance.now();
    lastVideoTime.current = -1;
    setStatusBoth("running");
    setCue(`Vamos con la ${EXERCISES[exerciseRef.current].label.toLowerCase()}.`);
    startTimers();
    frame.current = requestAnimationFrame(loop);
  }, [loop, setStatusBoth, startTimers]);

  const ensureDetector = useCallback(async () => {
    if (!detector.current) detector.current = await loadPoseDetector();
  }, []);

  /** Inicia la sesión: cámara, modelo, cuenta regresiva 3-2-1 y análisis. */
  const start = useCallback(async () => {
    if (statusRef.current === "running" || statusRef.current === "countdown") return;
    setError("");
    setFinished(null);

    if (statusRef.current === "paused") {
      realtimeRef.current.sendCommand("resume");
      voice.current.say("Seguimos.", { force: true, priority: VoicePriority.form });
      beginRunning();
      return;
    }
    sessionId.current = newSessionId();
    realtimeRef.current.startSession(sessionId.current);

    try {
      setStatusBoth("loading");
      resetCounters();
      stream.current = await openCamera();
      if (!alive.current) {
        // La vista se cerró mientras se pedía la cámara: no dejamos el stream abierto.
        stopStream(stream.current);
        stream.current = null;
        return;
      }
      if (!video.current) throw new Error("Sin elemento de video");
      video.current.srcObject = stream.current;
      await video.current.play();
      await ensureDetector();
    } catch (err) {
      console.error(err);
      stopStream(stream.current);
      stream.current = null;
      realtimeRef.current.endSession();
      setError(cameraErrorMessage(err));
      setStatusBoth("idle");
      setCue("No se pudo iniciar el análisis.");
      return;
    }

    setStatusBoth("countdown");
    let remaining = COUNTDOWN_SECONDS;
    setCountdown(remaining);
    voice.current.say(spanishNumber(remaining), { force: true, priority: VoicePriority.count });
    countdownId.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        voice.current.say(spanishNumber(remaining), { force: true, priority: VoicePriority.count });
        return;
      }
      voice.current.say("¡Ya!", { force: true, priority: VoicePriority.count });
      if (countdownId.current !== null) window.clearInterval(countdownId.current);
      countdownId.current = null;
      setCountdown(null);
      // La cuenta regresiva es el calentamiento: al terminar empieza la serie (WARMUP -> ACTIVE_SET).
      realtimeRef.current.sendCommand("skip");
      beginRunning();
    }, 1000);
  }, [beginRunning, ensureDetector, resetCounters, setStatusBoth, video]);

  /** Pausa el análisis y mantiene la cámara encendida para reanudar rápido. */
  const pause = useCallback(() => {
    if (statusRef.current !== "running") return;
    stopLoop();
    stopTimers();
    setStatusBoth("paused");
    setCue("Sesión en pausa.");
    voice.current.say("En pausa. Di reanudar cuando estés listo.", { force: true, priority: VoicePriority.form });
    realtimeRef.current.sendCommand("pause");
  }, [setStatusBoth, stopLoop, stopTimers]);

  const releaseCamera = useCallback(() => {
    stopLoop();
    stopTimers();
    if (countdownId.current !== null) window.clearInterval(countdownId.current);
    countdownId.current = null;
    stopStream(stream.current);
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    const ctx = canvas.current?.getContext("2d");
    if (canvas.current && ctx) ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
  }, [canvas, stopLoop, stopTimers, video]);

  /**
   * Deshace la última repetición. Se resuelve en el cliente: el comando
   * "undo" del backend revierte el último comando de control (pausa,
   * reanudar...), no una repetición, y la IA volvería a enviar su cuenta.
   * Por eso las reps del servidor se compensan con un contador de deshechas.
   */
  const undo = useCallback(() => {
    if (repsRef.current <= 0) return false;
    const mode: AnalysisMode = realtimeRef.current.serverCounting ? serverModeRef.current : "local";
    if (mode !== "ai" && !undoStack.current.isEmpty() && localRepsRef.current > 0) {
      undoStack.current.pop();
      localRepsRef.current -= 1;
    } else {
      undoneRef.current += 1;
    }
    syncReps();
    setCue("Repetición deshecha.");
    return true;
  }, [syncReps]);

  /** Termina la sesión y prepara el resumen. Libera la cámara. */
  const finish = useCallback((): FinishedSession | null => {
    const hadActivity = activeMs.current > 0 || repsRef.current > 0;
    releaseCamera();
    setStatusBoth("idle");
    setCountdown(null);
    realtimeRef.current.sendCommand("finish");
    realtimeRef.current.endSession();
    if (!hadActivity) {
      setCue("Sin actividad registrada.");
      return null;
    }
    const avgScore = scoreSum.current.count
      ? Math.round(scoreSum.current.total / scoreSum.current.count)
      : 0;
    const knee = kneeSum.current.count
      ? Math.round(kneeSum.current.total / kneeSum.current.count)
      : null;
    const summary: FinishedSession = {
      exercise: exerciseRef.current,
      reps: repsRef.current,
      accuracy: avgScore,
      durationSeconds: Math.round(activeMs.current / 1000),
      score: avgScore,
      ...(knee !== null ? { avgAngles: { knee } } : {}),
    };
    setFinished(summary);
    return summary;
  }, [releaseCamera, setStatusBoth]);

  const dismissSummary = useCallback(() => {
    setFinished(null);
    resetCounters();
    setCue("Listo para una nueva sesión.");
  }, [resetCounters]);

  const selectExercise = useCallback(
    (next: ExerciseId) => {
      if (statusRef.current === "running" || statusRef.current === "paused") return;
      exerciseRef.current = next;
      setExercise(next);
      resetCounters();
      voice.current.cancel();
      setCue(`Preparado para ${EXERCISES[next].label.toLowerCase()}.`);
    },
    [resetCounters],
  );

  const setVoiceEnabled = useCallback((next: boolean) => {
    voice.current.enabled = next;
    setVoiceOn(next);
    storage.setString(STORAGE_KEYS.voice, next ? "on" : "off");
    if (next) voice.current.say("Voz activada.", { force: true, priority: VoicePriority.form });
    else voice.current.cancel();
  }, []);

  const toggleVoice = useCallback(() => setVoiceEnabled(!voice.current.enabled), [setVoiceEnabled]);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    browserVoice.current?.setVolume(clamped);
    setVolumeState(clamped);
    storage.setString(STORAGE_KEYS.voiceVolume, String(clamped));
  }, []);

  /** Dice algo en voz alta con prioridad de aviso (respuestas a comandos de voz). */
  const speak = useCallback((text: string) => {
    voice.current.say(text, { force: true, priority: VoicePriority.form });
  }, []);

  /** Repite la última corrección (comando "repite"); si no hay ninguna, lo dice. */
  const repeatLast = useCallback(() => {
    if (!voice.current.repeatLast()) speak("Aún no tengo nada que repetir.");
  }, [speak]);

  /** Resumen hablado del avance (comando "cómo voy"). */
  const reportStatus = useCallback(() => {
    const target = EXERCISES[exerciseRef.current].target;
    const mean = scoreSum.current.count ? Math.round(scoreSum.current.total / scoreSum.current.count) : 0;
    speak(statusReport(repsRef.current, target, mean, Math.floor(activeMs.current / 1000)));
  }, [speak]);

  // Con conexión, el feedback del servidor manda en puntuación y consejo; reps y
  // fase solo cuando la IA respondió (phase presente). Con phase null la IA está
  // caída: el backend no avanza reps y el conteo local toma el relevo.
  useEffect(() => {
    const message = realtime.feedback;
    if (!message || statusRef.current !== "running") return;
    lastFeedbackAt.current = performance.now();
    recordScore(message.score);
    setCue(message.message);
    const phase = toRepPhase(message.phase);
    if (phase) {
      const previousMode = serverModeRef.current;
      if (previousMode !== "ai" && typeof message.reps === "number") {
        // La IA toma el relevo tras contar en local: sus reps son absolutas, así que se pliegan las locales para no duplicar.
        serverOffsetRef.current = Math.max(0, repsRef.current + undoneRef.current - message.reps);
        localRepsRef.current = 0;
        undoStack.current.clear();
      }
      setServerModeBoth("ai");
      setRepPhase(phase);
      if (phase !== "hold") phaseRef.current = phase;
      if (typeof message.reps === "number") {
        const before = repsRef.current;
        serverRepsRef.current = message.reps;
        const total = syncReps();
        if (total > before) announceRep(total);
      }
    } else {
      setServerModeBoth("fallback");
    }
    // La corrección local ya habla al instante; la del servidor solo se dice si es breve y no hay otra reciente.
    if (voice.current.msSinceSpoke() > 2500) {
      voice.current.say(briefSpoken(message.message), { priority: VoicePriority.chatter });
    }
  }, [announceRep, realtime.feedback, recordScore, setServerModeBoth, syncReps]);

  // Limpieza al desmontar: cámara, bucle y temporizadores.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      stopLoop();
      stopTimers();
      if (countdownId.current !== null) window.clearInterval(countdownId.current);
      countdownId.current = null;
      stopStream(stream.current);
      stream.current = null;
      voice.current.cancel();
      browserVoice.current?.dispose();
    };
  }, [stopLoop, stopTimers]);

  // Mantiene el enlace de voz sincronizado con el estado de la preferencia.
  useEffect(() => {
    voice.current.enabled = voiceOn;
  }, [voiceOn]);

  const averageScore = trend.length ? Math.round(trend.reduce((a, b) => a + b, 0) / trend.length) : score;

  return {
    exercise,
    status,
    countdown,
    reps,
    score,
    averageScore,
    angle,
    repPhase,
    cue,
    elapsed,
    trend,
    error,
    finished,
    voiceOn,
    canUndo: reps > 0,
    /** Quién analiza ahora mismo (para mostrarlo en la interfaz). */
    analysisMode: (realtime.serverCounting ? serverMode : "local") as AnalysisMode,
    speaking,
    volume,
    inferMs,
    /** Nombre de la voz de síntesis elegida (puede ser null hasta que el navegador cargue voces). */
    voiceName: () => browserVoice.current?.voiceName() ?? null,
    /** Sirve al reconocimiento de voz para no escuchar al propio entrenador. */
    isCoachSpeaking: () => voice.current.speaking || voice.current.msSinceSpoke() < 500,
    actions: {
      start,
      pause,
      finish,
      undo,
      selectExercise,
      toggleVoice,
      setVoiceEnabled,
      setVolume,
      speak,
      repeatLast,
      reportStatus,
      dismissSummary,
    },
  };
}
