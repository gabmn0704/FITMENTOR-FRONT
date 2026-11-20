import { useEffect, useRef } from "react";

const EVENT = "fitmentor:confetti";
const COLORS = ["#0a7a53", "#d4ff3a", "#ffc400", "#f6f8ff", "#56d596", "#6ff2c5"];

export interface ConfettiOptions {
  /** Origen como fracción de la pantalla (0-1). Por defecto, arriba al centro. */
  x?: number;
  y?: number;
  /** Cantidad de piezas. */
  count?: number;
}

/** Lanza confeti desde cualquier parte. Necesita un `<ConfettiHost />` montado (lo hace AppShell). */
export function fireConfetti(options: ConfettiOptions = {}): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ConfettiOptions>(EVENT, { detail: options }));
}

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  round: boolean;
  life: number;
}

/** Lienzo fijo y transparente que dibuja ráfagas de confeti. No hace nada con "menos movimiento". */
export function ConfettiHost() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext?.("2d");
    if (!el || !ctx) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    let pieces: Piece[] = [];
    let frame = 0;
    let last = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      el.width = window.innerWidth * dpr;
      el.height = window.innerHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const tick = (time: number) => {
      const dt = Math.min(32, time - last || 16) / 16;
      last = time;
      ctx.clearRect(0, 0, el.width, el.height);
      pieces = pieces.filter((p) => p.life > 0 && p.y < el.height + 40);
      for (const p of pieces) {
        p.vy += 0.16 * dt * dpr;
        p.vx *= 0.992;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.life -= dt;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 40);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }
      frame = pieces.length ? requestAnimationFrame(tick) : 0;
    };

    const onFire = (event: Event) => {
      if (reduce) return;
      const detail = (event as CustomEvent<ConfettiOptions>).detail ?? {};
      const count = detail.count ?? 150;
      const ox = (detail.x ?? 0.5) * el.width;
      const oy = (detail.y ?? 0.3) * el.height;
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.95;
        const speed = (6 + Math.random() * 11) * dpr;
        pieces.push({
          x: ox,
          y: oy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: (6 + Math.random() * 7) * dpr,
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.4,
          color: COLORS[i % COLORS.length],
          round: i % 5 === 0,
          life: 90 + Math.random() * 70,
        });
      }
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    window.addEventListener(EVENT, onFire);
    return () => {
      window.removeEventListener(EVENT, onFire);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvas} className="confetti-host" aria-hidden="true" />;
}
