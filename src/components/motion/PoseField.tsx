import { useEffect, useRef } from "react";

/**
 * Escena de fondo del acceso: una malla de puntos que flota y un esqueleto de postura haciendo sentadillas
 * con el ángulo de la rodilla en vivo, como lo ve la cámara de FitMentor. Un solo canvas, ~60 puntos,
 * pausado cuando la pestaña está oculta y quieto con "menos movimiento".
 */

type Vec = [number, number];

// Pose de pie y pose en sentadilla (vista lateral, unidades arbitrarias, y hacia arriba es negativo).
const STAND: Record<string, Vec> = {
  ankle: [0, 0],
  knee: [0, -100],
  hip: [0, -200],
  shoulder: [0, -300],
  head: [0, -338],
  elbow: [6, -240],
  wrist: [10, -186],
};
const SQUAT: Record<string, Vec> = {
  ankle: [0, 0],
  knee: [44, -90],
  hip: [-56, -90],
  shoulder: [-14, -181],
  head: [4, -216],
  elbow: [38, -190],
  wrist: [84, -186],
};

const BONES: Array<[string, string]> = [
  ["ankle", "knee"],
  ["knee", "hip"],
  ["hip", "shoulder"],
  ["shoulder", "head"],
  ["shoulder", "elbow"],
  ["elbow", "wrist"],
];

const PERIOD = 3600;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function joints(t: number): Record<string, Vec> {
  const out: Record<string, Vec> = {};
  for (const key of Object.keys(STAND)) {
    out[key] = [lerp(STAND[key][0], SQUAT[key][0], t), lerp(STAND[key][1], SQUAT[key][1], t)];
  }
  return out;
}

function kneeAngle(j: Record<string, Vec>): number {
  const a: Vec = [j.ankle[0] - j.knee[0], j.ankle[1] - j.knee[1]];
  const b: Vec = [j.hip[0] - j.knee[0], j.hip[1] - j.knee[1]];
  const cos = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
  return Math.round((Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
}

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export function PoseField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext?.("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0;
    let h = 0;
    let nodes: Node[] = [];
    let frame = 0;
    let running = false;
    const pointer = { x: -9999, y: -9999 };
    let reps = 0;
    let lastPhase = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(box.width));
      h = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(64, Math.max(22, (w * h) / 16000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 1 + Math.random() * 1.8,
      }));
      if (!running) draw(performance.now());
    };

    const drawFigure = (time: number) => {
      const narrow = w < 560;
      const scale = Math.min(h * (narrow ? 0.46 : 0.54), 460) / 340;
      const baseX = w * (narrow ? 0.76 : 0.74);
      const baseY = h * (narrow ? 0.9 : 0.83);
      const phase = reduce ? 0.55 : (time % PERIOD) / PERIOD;
      // 0 de pie -> 1 abajo -> 0 de pie, con pausa arriba y abajo.
      const wave = 0.5 - 0.5 * Math.cos(phase * Math.PI * 2);
      const t = Math.min(1, Math.max(0, (wave - 0.08) / 0.84));
      const eased = t * t * (3 - 2 * t);
      if (!reduce && phase < lastPhase) reps += 1;
      lastPhase = phase;

      const j = joints(eased);
      const P = (key: string): Vec => [baseX + j[key][0] * scale, baseY + j[key][1] * scale];

      // Suelo con regla
      ctx.save();
      ctx.strokeStyle = "rgba(244,246,251,0.22)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(baseX - 190 * scale, baseY + 10 * scale);
      ctx.lineTo(baseX + 190 * scale, baseY + 10 * scale);
      ctx.stroke();
      for (let i = -9; i <= 9; i += 1) {
        const tick = i % 3 === 0 ? 12 : 6;
        ctx.beginPath();
        ctx.moveTo(baseX + i * 20 * scale, baseY + 10 * scale);
        ctx.lineTo(baseX + i * 20 * scale, baseY + (10 + tick) * scale * 0.7);
        ctx.stroke();
      }
      ctx.restore();

      // Huesos
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(3, 7 * scale);
      ctx.strokeStyle = "rgba(246,248,255,0.9)";
      ctx.shadowColor = "rgba(27,59,255,0.9)";
      ctx.shadowBlur = 22;
      for (const [a, b] of BONES) {
        const pa = P(a);
        const pb = P(b);
        ctx.beginPath();
        ctx.moveTo(pa[0], pa[1]);
        ctx.lineTo(pb[0], pb[1]);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Cabeza
      const head = P("head");
      ctx.beginPath();
      ctx.arc(head[0], head[1] - 8 * scale, 17 * scale, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(246,248,255,0.95)";
      ctx.fill();

      // Articulaciones
      for (const key of ["ankle", "hip", "shoulder", "elbow", "wrist"]) {
        const p = P(key);
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(4, 7.5 * scale), 0, Math.PI * 2);
        ctx.fillStyle = "#1b3bff";
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#f6f8ff";
        ctx.stroke();
      }

      // Rodilla: el punto bermellón de la marca, con anillo que late y lectura del ángulo.
      const knee = P("knee");
      const pulse = reduce ? 0.4 : (time % 1200) / 1200;
      ctx.beginPath();
      ctx.arc(knee[0], knee[1], (9 + pulse * 22) * scale, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,61,31,${(1 - pulse) * 0.8})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(knee[0], knee[1], Math.max(6, 11 * scale), 0, Math.PI * 2);
      ctx.fillStyle = "#ff3d1f";
      ctx.fill();

      const angle = kneeAngle(j);
      // Lectura fija a la izquierda del cuerpo; una línea fina la une con la rodilla.
      const rx = baseX - 78 * scale;
      const ry = baseY - 150 * scale;
      const big = Math.round(Math.max(22, 42 * scale));
      ctx.save();
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.strokeStyle = "rgba(255,61,31,0.55)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(rx + 8, ry - big * 0.35);
      ctx.lineTo(knee[0] - 12 * scale, knee[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `900 ${big}px Archivo, "Arial Narrow", sans-serif`;
      ctx.fillStyle = "#f6f8ff";
      ctx.fillText(`${kneeAngle(j)}°`, rx, ry);
      ctx.font = `800 ${Math.round(Math.max(10, 13 * scale))}px Archivo, sans-serif`;
      ctx.fillStyle = "rgba(244,246,251,0.7)";
      ctx.fillText("RODILLA", rx, ry + 18 * scale + 4);
      if (reps > 0 || reduce) {
        ctx.fillStyle = "#ff3d1f";
        ctx.fillText(`REP ${reduce ? 8 : reps}`, rx, ry - big - 2);
      }
      ctx.restore();
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Malla de puntos: se alejan un poco del cursor y se unen con líneas finas.
      const link = Math.min(150, Math.max(90, w / 7));
      for (const n of nodes) {
        if (!reduce && running) {
          const dx = n.x - pointer.x;
          const dy = n.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < 130 && d > 0) {
            n.x += (dx / d) * (130 - d) * 0.02;
            n.y += (dy / d) * (130 - d) * 0.02;
          }
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -10) n.x = w + 10;
          if (n.x > w + 10) n.x = -10;
          if (n.y < -10) n.y = h + 10;
          if (n.y > h + 10) n.y = -10;
        }
      }
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let k = i + 1; k < nodes.length; k += 1) {
          const d = Math.hypot(nodes[i].x - nodes[k].x, nodes[i].y - nodes[k].y);
          if (d < link) {
            ctx.strokeStyle = `rgba(244,246,251,${(1 - d / link) * 0.16})`;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[k].x, nodes[k].y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.r > 2.2 ? "rgba(255,61,31,0.85)" : "rgba(244,246,251,0.5)";
        ctx.fill();
      }

      drawFigure(time);
    };

    const loop = (time: number) => {
      draw(time);
      frame = running ? requestAnimationFrame(loop) : 0;
    };

    const start = () => {
      if (reduce || running || document.hidden) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      pointer.x = event.clientX - box.left;
      pointer.y = event.clientY - box.top;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    // La tipografía de la lectura se carga después: se vuelve a dibujar cuando llega.
    void document.fonts?.ready.then(() => !running && draw(performance.now()));
    start();

    return () => {
      stop();
      observer?.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="pose-field" aria-hidden="true" />;
}
