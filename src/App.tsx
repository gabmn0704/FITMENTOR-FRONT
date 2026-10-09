import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Activity,
  Bell,
  Camera,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  LayoutDashboard,
  Pause,
  Play,
  Settings,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { usePoseFeedback } from "./usePoseFeedback";

type Exercise = "squat" | "push_up" | "plank" | "deadlift";
type View = "Resumen" | "Entrenamiento" | "Progreso" | "Configuración";
type Point = { x: number; y: number; visibility?: number };
type Session = { exercise: string; reps: number; score: number; date: string };
const exercises: Record<Exercise, { label: string; target: number }> = {
  squat: { label: "Sentadilla", target: 12 },
  push_up: { label: "Flexión", target: 10 },
  plank: { label: "Plancha", target: 60 },
  deadlift: { label: "Peso muerto", target: 10 },
};
const edges: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
];
const limit = (n: number, min: number, max: number) =>
  Math.min(Math.max(n, min), max);
function angle(a: Point, b: Point, c: Point) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const size = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y);
  return size
    ? (Math.acos(limit((ab.x * cb.x + ab.y * cb.y) / size, -1, 1)) * 180) /
        Math.PI
    : null;
}
function pose(points: Point[], exercise: Exercise) {
  const visible = (...indices: number[]) =>
    indices.every(
      (index) => points[index] && (points[index].visibility ?? 1) > 0.55,
    );
  const lh = points[23],
    rh = points[24],
    lk = points[25],
    rk = points[26],
    la = points[27],
    ra = points[28],
    ls = points[11],
    rs = points[12],
    le = points[13],
    re = points[14],
    lw = points[15],
    rw = points[16];
  const knees = [
    visible(23, 25, 27) ? angle(lh, lk, la) : null,
    visible(24, 26, 28) ? angle(rh, rk, ra) : null,
  ].filter((n): n is number => n !== null);
  const elbows = [
    visible(11, 13, 15) ? angle(ls, le, lw) : null,
    visible(12, 14, 16) ? angle(rs, re, rw) : null,
  ].filter((n): n is number => n !== null);
  const hips = [
    visible(11, 23, 25) ? angle(ls, lh, lk) : null,
    visible(12, 24, 26) ? angle(rs, rh, rk) : null,
  ].filter((n): n is number => n !== null);
  const average = (values: number[]) =>
    values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : null;
  const knee = average(knees),
    elbow = average(elbows),
    hip = average(hips);
  const shoulderY = visible(11, 12) ? (ls.y + rs.y) / 2 : null,
    hipY = visible(23, 24) ? (lh.y + rh.y) / 2 : null,
    ankleY = visible(27, 28) ? (la.y + ra.y) / 2 : null;
  const alignment =
    shoulderY !== null && hipY !== null && ankleY !== null
      ? Math.abs(hipY - (shoulderY + ankleY) / 2)
      : null;
  const movementAngle =
    exercise === "push_up" ? elbow : exercise === "deadlift" ? hip : knee;
  let score = movementAngle === null ? 0 : 82;
  if (exercise === "squat" && knee !== null)
    score = limit(100 - Math.abs(knee - 95) * 0.45, 45, 98);
  if (exercise === "push_up" && elbow !== null && alignment !== null)
    score = limit(100 - Math.abs(elbow - 90) * 0.18 - alignment * 180, 35, 98);
  if (exercise === "plank" && alignment !== null)
    score = limit(100 - alignment * 260, 35, 98);
  if (exercise === "deadlift" && hip !== null)
    score = limit(100 - Math.abs(hip - 125) * 0.3, 45, 98);
  const hasPose =
    movementAngle !== null || (exercise === "plank" && alignment !== null);
  return hasPose
    ? {
        score: Math.round(score),
        knee: knee === null ? null : Math.round(knee),
        movementAngle:
          movementAngle === null ? null : Math.round(movementAngle),
        alignment,
      }
    : null;
}
function coaching(exercise: Exercise, data: ReturnType<typeof pose>) {
  if (!data)
    return "Aléjate un poco y coloca hombros, cadera y pies dentro del encuadre.";
  if (exercise === "squat")
    return (data.knee ?? 180) > 125
      ? "Desciende con control; flexiona las rodillas."
      : (data.knee ?? 0) < 55
        ? "Reduce un poco la profundidad y mantén el control."
        : "Buena posición. Empuja el suelo para subir.";
  if (exercise === "push_up")
    return (data.movementAngle ?? 180) < 75
      ? "Baja hasta donde mantengas el cuerpo alineado."
      : (data.alignment ?? 0) > 0.12
        ? "Aprieta el abdomen y mantén cadera y hombros en línea."
        : "Buen control. Mantén el cuerpo firme al bajar.";
  if (exercise === "plank")
    return (data.alignment ?? 0) > 0.1
      ? "Ajusta la cadera para alinear hombros, cadera y tobillos."
      : "Buena alineación. Respira sin perder la postura.";
  return (data.movementAngle ?? 180) < 90
    ? "Lleva la cadera atrás y conserva la espalda larga."
    : "Buen patrón. Sube extendiendo la cadera con control.";
}

export default function App() {
  const [view, setView] = useState<View>("Resumen");
  const [exercise, setExercise] = useState<Exercise>("squat");
  const [on, setOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voice, setVoice] = useState(
    () => localStorage.getItem("fitmentor-voice") !== "off",
  );
  const [reps, setReps] = useState(0);
  const [score, setScore] = useState(0);
  const [note, setNote] = useState("Activa la cámara para comenzar.");
  const [status, setStatus] = useState("Listo para analizar tu técnica.");
  const [error, setError] = useState("");
  const [knee, setKnee] = useState<number | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const { sendPose, feedback, connected } = usePoseFeedback();
  const displayedScore = feedback?.score ?? score;
  const displayedNote = feedback?.message ?? note;
  const video = useRef<HTMLVideoElement>(null),
    canvas = useRef<HTMLCanvasElement>(null),
    stream = useRef<MediaStream>(),
    detector = useRef<PoseLandmarker>(),
    raf = useRef<number>(),
    last = useRef(0),
    lastKnee = useRef<number | null>(null),
    phase = useRef("ready"),
    count = useRef(0),
    spoken = useRef(0);
  useEffect(() => {
    try {
      setHistory(JSON.parse(localStorage.getItem("fitmentor-history") ?? "[]"));
    } catch {}
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      stream.current?.getTracks().forEach((t) => t.stop());
      detector.current?.close();
    };
  }, []);
  const say = (text: string, force = false) => {
    if (!voice || !("speechSynthesis" in window)) return;
    const now = Date.now();
    if (!force && now - spoken.current < 3500) return;
    spoken.current = now;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    u.rate = 1.02;
    window.speechSynthesis.speak(u);
  };
  useEffect(() => {
    if (feedback) say(feedback.message);
  }, [feedback, voice]);
  const draw = (points: Point[]) => {
    const c = canvas.current,
      v = video.current,
      x = c?.getContext("2d");
    if (!c || !v || !x) return;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    x.clearRect(0, 0, c.width, c.height);
    x.strokeStyle = "#b7f36b";
    x.fillStyle = "#fff";
    x.lineWidth = 4;
    edges.forEach(([a, b]) => {
      if (!points[a] || !points[b]) return;
      x.beginPath();
      x.moveTo(points[a].x * c.width, points[a].y * c.height);
      x.lineTo(points[b].x * c.width, points[b].y * c.height);
      x.stroke();
    });
    points.forEach((p) => {
      if ((p.visibility ?? 1) < 0.45) return;
      x.beginPath();
      x.arc(p.x * c.width, p.y * c.height, 4, 0, Math.PI * 2);
      x.fill();
    });
  };
  const countRep = (data: NonNullable<ReturnType<typeof pose>>) => {
    if (exercise === "plank" || data.movementAngle === null) return;
    const old = lastKnee.current;
    lastKnee.current =
      old === null
        ? data.movementAngle
        : old * 0.72 + data.movementAngle * 0.28;
    const a = lastKnee.current;
    let next = phase.current;
    if (exercise === "squat") {
      if (a > 150 && next === "ready") next = "up";
      if (a < 125 && next === "up") next = "down";
      if (a < 105 && next === "down") next = "bottom";
      if (a > 145 && next === "bottom") {
        next = "up";
        count.current++;
        setReps(count.current);
        say("Repetición completada", true);
      }
    } else if (exercise === "push_up") {
      if (a > 150 && next === "ready") next = "up";
      if (a < 120 && next === "up") next = "down";
      if (a < 90 && next === "down") next = "bottom";
      if (a > 145 && next === "bottom") {
        next = "up";
        count.current++;
        setReps(count.current);
        say("Repetición completada", true);
      }
    } else {
      if (a > 155 && next === "ready") next = "up";
      if (a < 140 && next === "up") next = "down";
      if (a < 115 && next === "down") next = "bottom";
      if (a > 155 && next === "bottom") {
        next = "up";
        count.current++;
        setReps(count.current);
        say("Repetición completada", true);
      }
    }
    phase.current = next;
  };
  const loop = () => {
    const v = video.current;
    if (!v || v.readyState < 2 || !detector.current) {
      raf.current = requestAnimationFrame(loop);
      return;
    }
    const now = performance.now();
    if (now - last.current > 80) {
      const points =
        detector.current.detectForVideo(v, now).landmarks?.[0] ?? [];
      sendPose(exercise, points, v.videoWidth || 16, v.videoHeight || 9);
      const data = pose(points, exercise);
      if (data) {
        const text = coaching(exercise, data);
        setScore(data.score);
        setNote(text);
        setKnee(data.knee);
        setStatus("IA activa: analizando cada movimiento.");
        draw(points);
        countRep(data);
        say(text);
      } else setStatus("Buscando una pose completa y estable...");
      last.current = now;
    }
    raf.current = requestAnimationFrame(loop);
  };
  const start = async () => {
    try {
      setLoading(true);
      setError("");
      const current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      stream.current = current;
      if (!video.current) throw new Error();
      video.current.srcObject = current;
      await video.current.play();
      if (!detector.current) {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
        );
        detector.current = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.65,
          minPosePresenceConfidence: 0.65,
          minTrackingConfidence: 0.7,
        });
      }
      setOn(true);
      setStatus("IA activa: coloca todo el cuerpo dentro del encuadre.");
      loop();
    } catch (error) {
      console.error(error);
      stream.current?.getTracks().forEach((track) => track.stop());
      stream.current = undefined;
      const name = error instanceof DOMException ? error.name : "";
      const detail =
        name === "NotAllowedError"
          ? "Permiso de cámara denegado. Activa la cámara en los permisos del navegador."
          : name === "NotFoundError"
            ? "No se encontró ninguna cámara conectada."
            : name === "NotReadableError"
              ? "La cámara está siendo usada por otra aplicación."
              : "No se pudo iniciar la cámara o la IA. Revisa la conexión y vuelve a intentarlo.";
      setError(detail);
      setStatus("No se pudo iniciar el análisis.");
    } finally {
      setLoading(false);
    }
  };
  const stop = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = undefined;
    window.speechSynthesis?.cancel();
    setOn(false);
    setStatus("Sesión pausada.");
    phase.current = "ready";
  };
  const toggle = () => {
    if (on) stop();
    else {
      count.current = 0;
      setReps(0);
      lastKnee.current = null;
      void start();
    }
  };
  const choose = (next: Exercise) => {
    setExercise(next);
    count.current = 0;
    setReps(0);
    lastKnee.current = null;
    phase.current = "ready";
    setNote(`Preparado para ${exercises[next].label.toLowerCase()}.`);
  };
  const save = () => {
    if (!reps) return;
    const next = [
      {
        exercise: exercises[exercise].label,
        reps,
        score,
        date: new Date().toLocaleDateString("es-ES"),
      },
      ...history,
    ].slice(0, 8);
    setHistory(next);
    localStorage.setItem("fitmentor-history", JSON.stringify(next));
    stop();
    setView("Progreso");
  };
  const toggleVoice = () => {
    const next = !voice;
    setVoice(next);
    localStorage.setItem("fitmentor-voice", next ? "on" : "off");
    if (next) say("Correcciones por voz activadas", true);
  };
  const nav: Array<{ label: View; icon: typeof Activity }> = [
    { label: "Resumen", icon: LayoutDashboard },
    { label: "Entrenamiento", icon: Dumbbell },
    { label: "Progreso", icon: Activity },
    { label: "Configuración", icon: Settings },
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Zap size={18} fill="currentColor" />
          </div>
          <span>fitmentor</span>
        </div>
        <div className="side-label">Espacio personal</div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.label}
              className={view === item.label ? "nav-item active" : "nav-item"}
              onClick={() => setView(item.label)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <button className="nav-item" onClick={() => setView("Configuración")}>
            <CircleHelp size={18} />
            <span>Ayuda</span>
          </button>
          <div className="profile">
            <div className="avatar">AR</div>
            <div>
              <strong>Alex Ríos</strong>
              <small>Nivel intermedio</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Mi espacio</span>
            <ChevronRight size={15} />
            <strong>{view}</strong>
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificaciones">
              <Bell size={18} />
            </button>
            <div className="mini-avatar">AR</div>
          </div>
        </header>
        {view === "Configuración" ? (
          <section className="settings-page">
            <p className="eyebrow">CONTROL DE LA EXPERIENCIA</p>
            <h1>Configuración</h1>
            <p className="subtitle">
              Ajusta cómo FitMentor te acompaña durante tus sesiones.
            </p>
            <div className="settings-list">
              <button className="setting-row" onClick={toggleVoice}>
                <span className="setting-icon">
                  {voice ? <Volume2 size={19} /> : <VolumeX size={19} />}
                </span>
                <span>
                  <strong>Correcciones por voz</strong>
                  <small>
                    {voice ? "Activas durante el ejercicio" : "Desactivadas"}
                  </small>
                </span>
                <span className={`toggle ${voice ? "on" : ""}`} />
              </button>
              <div className="setting-row">
                <span className="setting-icon">
                  <ShieldCheck size={19} />
                </span>
                <span>
                  <strong>Privacidad</strong>
                  <small>
                    El video se procesa en tu dispositivo; solo se envían puntos
                    de postura al servidor de IA.
                  </small>
                </span>
              </div>
            </div>
          </section>
        ) : view === "Progreso" ? (
          <section className="progress-page">
            <p className="eyebrow">HISTORIAL DE SESIONES</p>
            <h1>Tu progreso</h1>
            <p className="subtitle">
              Cada sesión suma control, consistencia y técnica.
            </p>
            <div className="progress-overview">
              <div>
                <span>Sesiones</span>
                <strong>{history.length}</strong>
              </div>
              <div>
                <span>Repeticiones</span>
                <strong>
                  {history.reduce((sum, item) => sum + item.reps, 0)}
                </strong>
              </div>
              <div>
                <span>Última precisión</span>
                <strong>{history[0]?.score ?? 0}%</strong>
              </div>
            </div>
            <div className="history-list">
              {history.length ? (
                history.map((item, index) => (
                  <div className="history-row" key={`${item.date}-${index}`}>
                    <div className="history-date">
                      <strong>{item.reps}</strong>
                      <span>REPS</span>
                    </div>
                    <div className="history-main">
                      <strong>{item.exercise}</strong>
                      <span>{item.date} · Técnica registrada</span>
                    </div>
                    <span className="history-score">{item.score}%</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  Completa una sesión y aparecerá aquí.
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="welcome">
              <div>
                <p className="eyebrow">
                  {view === "Entrenamiento"
                    ? "CENTRO DE ENTRENAMIENTO"
                    : "ENTRENAMIENTO EN TIEMPO REAL"}
                </p>
                <h1>
                  {view === "Entrenamiento" ? (
                    <>
                      Elige tu <em>movimiento.</em>
                    </>
                  ) : (
                    <>
                      Corrección con <em>IA + cámara.</em>
                    </>
                  )}
                </h1>
                <p className="subtitle">
                  La IA analiza tu postura y te corrige mientras entrenas.
                </p>
              </div>
              <div className="week-card">
                <div className="week-title">
                  <span>Ejercicio activo</span>
                  <Sparkles size={16} />
                </div>
                <select
                  value={exercise}
                  onChange={(e) => choose(e.target.value as Exercise)}
                >
                  {Object.entries(exercises).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </section>
            <section className="metrics">
              <div className="metric">
                <div className="metric-icon coral">
                  <Activity size={19} />
                </div>
                <div>
                  <span>Repeticiones</span>
                  <strong>{reps}</strong>
                  <small>Meta: {exercises[exercise].target}</small>
                </div>
              </div>
              <div className="metric">
                <div className="metric-icon green">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <span>Precisión</span>
                  <strong>{displayedScore}%</strong>
                  <small>
                    {phase.current === "ready" ? "Preparado" : phase.current}
                  </small>
                </div>
              </div>
              <div className="metric">
                <div className="metric-icon amber">
                  <Camera size={19} />
                </div>
                <div>
                  <span>Cámara</span>
                  <strong>{on ? "En vivo" : "Lista"}</strong>
                  <small>Procesamiento local</small>
                </div>
              </div>
            </section>
            <section className="dashboard-grid">
              <div className="session-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">LIVE AI COACH</p>
                    <h2>{exercises[exercise].label}</h2>
                  </div>
                  <span className="duration">
                    {on ? "● EN VIVO" : "EN ESPERA"}
                  </span>
                </div>
                <div className="camera-frame">
                  <video
                    ref={video}
                    autoPlay
                    playsInline
                    muted
                    style={{ display: on ? "block" : "none" }}
                  />
                  <div
                    className="camera-placeholder"
                    style={{ display: on ? "none" : "grid" }}
                  >
                    <Camera size={30} />
                    <strong>
                      Coloca tu cuerpo completo frente a la cámara
                    </strong>
                    <span>Buena luz, cámara estable y espacio libre.</span>
                  </div>
                  <canvas ref={canvas} />
                </div>
                <div className="session-controls">
                  <button
                    className="primary-button"
                    onClick={toggle}
                    disabled={loading}
                  >
                    {on ? (
                      <Pause size={17} />
                    ) : (
                      <Play size={17} fill="currentColor" />
                    )}
                    {on ? "Pausar sesión" : "Comenzar análisis"}
                  </button>
                  {on && (
                    <button className="finish-button" onClick={save}>
                      Guardar sesión
                    </button>
                  )}
                  <button className="voice-button" onClick={toggleVoice}>
                    {voice ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </button>
                </div>
                <p className="status-line">
                  {connected ? "Feedback remoto conectado." : "Feedback local activo."}
                </p>
                {error && <div className="camera-error">{error}</div>}
              </div>
              <div className="insight-panel">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">FEEDBACK INSTANTÁNEO</p>
                    <h2>Tu técnica</h2>
                  </div>
                  <Sparkles size={19} />
                </div>
                <div className="rep-display">
                  <strong>{reps}</strong>
                  <span>/{exercises[exercise].target} reps</span>
                </div>
                <div
                  className="score-ring"
                  style={{ "--score-progress": `${displayedScore}%` } as CSSProperties}
                >
                  <div>
                    <strong>{displayedScore}</strong>
                    <span>/ 100</span>
                  </div>
                </div>
                <p className="insight-title">{displayedNote}</p>
                <p className="insight-copy">
                  {knee
                    ? `Ángulo de rodilla: ${knee}°`
                    : "El score aparece cuando la pose es estable."}
                </p>
                <div className="insight-bar">
                  <span style={{ width: `${displayedScore}%` }} />
                </div>
                <div className="insight-foot">
                  <span>Calidad técnica</span>
                  <strong>{displayedScore}%</strong>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
