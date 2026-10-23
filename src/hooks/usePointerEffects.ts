import { useEffect } from "react";

/**
 * Efectos de puntero delegados en un solo listener: foco de luz que sigue al cursor
 * en tarjetas y fichas (`--mx`, `--my`) y paralaje suave en la portada (`--px`, `--py`).
 * Solo con ratón real y sin "reducir movimiento".
 */
export function usePointerEffects(): void {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || frame) return;
      const { clientX, clientY } = event;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const lit = target.closest<HTMLElement>(".card, .tile, .poster-hero, .routine-item");
        if (lit) {
          const box = lit.getBoundingClientRect();
          lit.style.setProperty("--mx", `${clientX - box.left}px`);
          lit.style.setProperty("--my", `${clientY - box.top}px`);
        }
        const hero = target.closest<HTMLElement>(".poster-hero");
        if (hero) {
          const box = hero.getBoundingClientRect();
          hero.style.setProperty("--px", ((clientX - box.left) / box.width - 0.5).toFixed(3));
          hero.style.setProperty("--py", ((clientY - box.top) / box.height - 0.5).toFixed(3));
        }
      });
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
