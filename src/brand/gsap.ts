/**
 * GSAP se descarga aparte (unos 27 KB comprimidos) para que la pantalla de acceso pinte sin esperarlo.
 * Logo y mascota se ven completos en su pose final desde el primer instante; cuando llega GSAP, se animan.
 */
type Gsap = typeof import("gsap").gsap;

let pending: Promise<Gsap | null> | null = null;

/** Promesa compartida de GSAP. Devuelve `null` en pruebas (jsdom no mide SVG) o si la descarga falla. */
export function loadGsap(): Promise<Gsap | null> {
  if (import.meta.env.MODE === "test" || typeof window === "undefined") return Promise.resolve(null);
  pending ??= import("gsap")
    .then((mod) => {
      const gsap = mod.gsap ?? mod.default;
      // Algunas capas solo existen en ciertos estados de la mascota: no es un error que falten.
      gsap.config({ nullTargetWarn: false });
      return gsap;
    })
    .catch(() => null);
  return pending;
}

/** `true` si el usuario pidió menos movimiento. */
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Media query que usa `gsap.matchMedia()` para animar solo con movimiento permitido. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
