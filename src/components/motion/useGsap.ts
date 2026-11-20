import { useEffect, type DependencyList, type RefObject } from "react";

type GsapModule = typeof import("gsap");
type Gsap = GsapModule["gsap"];
type ScrollTriggerType = typeof import("gsap/ScrollTrigger")["ScrollTrigger"];

export interface GsapKit {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerType;
  /** Verdadero si la persona pidió menos movimiento: solo fundidos, sin desplazamientos ni scrub. */
  reduce: boolean;
}

let loading: Promise<Omit<GsapKit, "reduce">> | null = null;

/**
 * GSAP y ScrollTrigger se descargan aparte (no entran en el paquete inicial de la pantalla de acceso).
 * La primera llamada inicia la descarga; las siguientes reutilizan la misma promesa.
 */
export function loadGsap(): Promise<Omit<GsapKit, "reduce">> {
  if (!loading) {
    loading = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([core, plugin]) => {
      core.gsap.registerPlugin(plugin.ScrollTrigger);
      return { gsap: core.gsap, ScrollTrigger: plugin.ScrollTrigger };
    });
  }
  return loading;
}

/**
 * Ejecuta animaciones GSAP dentro de `scope` con `gsap.matchMedia`: todo lo creado (tweens, ScrollTriggers)
 * se revierte al desmontar o al cambiar las dependencias, y la preferencia de menos movimiento se respeta.
 */
export function useGsap(
  scope: RefObject<HTMLElement>,
  setup: (kit: GsapKit) => void | (() => void),
  deps: DependencyList = [],
): void {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    let alive = true;
    let revert: (() => void) | undefined;
    loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (!alive || !scope.current) return;
        const mm = gsap.matchMedia(scope.current);
        mm.add(
          { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
          (context) => setup({ gsap, ScrollTrigger, reduce: Boolean(context.conditions?.reduce) }),
        );
        revert = () => mm.revert();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      revert?.();
    };
    // Las dependencias las decide quien llama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
