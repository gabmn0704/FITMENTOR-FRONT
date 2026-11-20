import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { RefObject } from "react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

/** Solo se anima cuando la persona no pidió menos movimiento. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";

/**
 * Entrada de las páginas: lo marcado con `data-reveal` sube y aparece en cascada al montar;
 * lo marcado con `data-reveal="scroll"` espera a entrar en pantalla. Con movimiento reducido no se toca nada.
 * Todo vive dentro del contexto de useGSAP: al desmontar se revierten tweens y ScrollTriggers.
 */
export function useReveal(scope: RefObject<HTMLElement>, dependencies: unknown[] = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const now = gsap.utils.toArray<HTMLElement>('[data-reveal]:not([data-reveal="scroll"])', root);
        if (now.length) {
          gsap.fromTo(
            now,
            { y: 26, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.9, ease: "expo.out", stagger: 0.055, delay: 0.08, clearProps: "transform,opacity,visibility" },
          );
        }
        const later = gsap.utils.toArray<HTMLElement>('[data-reveal="scroll"]', root);
        if (later.length) {
          gsap.set(later, { y: 40, autoAlpha: 0 });
          ScrollTrigger.batch(later, {
            start: "top 92%",
            once: true,
            onEnter: (batch) =>
              gsap.to(batch, { y: 0, autoAlpha: 1, duration: 0.9, ease: "expo.out", stagger: 0.07, clearProps: "transform,opacity,visibility" }),
          });
        }
      });
      return () => mm.revert();
    },
    { scope, dependencies, revertOnUpdate: true },
  );
}

/** Ejecuta `build` solo con movimiento permitido, dentro de un matchMedia que se revierte solo. */
export function withMotion(build: () => void | (() => void)): () => void {
  const mm = gsap.matchMedia();
  mm.add(MOTION_OK, build);
  return () => mm.revert();
}
