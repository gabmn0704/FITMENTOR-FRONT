import type { CSSProperties, ReactNode } from "react";
import { LogoMark } from "../../brand/Logo";

/** Silueta que se dibuja mientras llega cada sección: copia la estructura real de esa pantalla. */
export type LoaderLayout = "home" | "train" | "progress" | "routine" | "achievements" | "coach" | "profile" | "onboarding";

interface PageLoaderProps {
  layout?: LoaderLayout;
  /** Texto para lectores de pantalla y la línea pequeña junto a la marca. */
  label?: string;
}

/** Pieza de esqueleto. `i` ordena la cascada de aparición y el brillo. */
function Bone({ className = "", w, h, i = 0, style }: { className?: string; w?: string; h?: number; i?: number; style?: CSSProperties }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width: w, height: h, ["--i" as string]: i, ...style }}
    />
  );
}

function Header({ i = 0 }: { i?: number }) {
  return (
    <div className="pl-header">
      <Bone className="skeleton--line" w="14%" i={i} />
      <Bone className="skeleton--title" w="46%" i={i + 1} />
      <Bone className="skeleton--line skeleton--faint" w="32%" i={i + 2} />
    </div>
  );
}

function Rows({ count, from }: { count: number; from: number }) {
  return (
    <div className="pl-rows">
      {Array.from({ length: count }, (_, n) => (
        <div key={n} className="pl-row">
          <Bone className="skeleton--avatar" i={from + n} />
          <span className="pl-row__text">
            <Bone className="skeleton--line" w={`${72 - n * 8}%`} i={from + n} />
            <Bone className="skeleton--line skeleton--faint" w={`${44 - n * 5}%`} i={from + n} />
          </span>
          <Bone className="skeleton--pill" i={from + n} />
        </div>
      ))}
    </div>
  );
}

const LAYOUTS: Record<LoaderLayout, () => ReactNode> = {
  home: () => (
    <>
      <div className="pl-hero">
        <div className="pl-hero__copy">
          <Bone className="skeleton--line" w="30%" i={0} />
          <Bone className="skeleton--display" w="88%" i={1} />
          <Bone className="skeleton--display" w="62%" i={2} />
          <Bone className="skeleton--line skeleton--faint" w="70%" i={3} />
          <Bone className="skeleton--button" i={4} />
        </div>
        <Bone className="skeleton--figure" i={2} />
      </div>
      <div className="pl-grid pl-grid--3">
        {[0, 1, 2].map((n) => (
          <Bone key={n} className="skeleton--tile" i={5 + n} />
        ))}
      </div>
      <Rows count={3} from={8} />
    </>
  ),
  train: () => (
    <>
      <Header />
      <div className="pl-split pl-split--wide">
        <Bone className="skeleton--stage" i={3} />
        <div className="pl-stack">
          <Bone className="skeleton--tile" i={4} />
          <Bone className="skeleton--tile skeleton--tile-sm" i={5} />
          <Bone className="skeleton--button skeleton--block" i={6} />
        </div>
      </div>
    </>
  ),
  progress: () => (
    <>
      <Header />
      <div className="pl-grid pl-grid--4">
        {[0, 1, 2, 3].map((n) => (
          <Bone key={n} className="skeleton--tile" i={3 + n} />
        ))}
      </div>
      <div className="pl-chart" aria-hidden="true">
        {[42, 64, 38, 76, 58, 88, 70].map((h, n) => (
          <Bone key={n} className="pl-chart__bar" i={7 + n} style={{ height: `${h}%` }} />
        ))}
      </div>
    </>
  ),
  routine: () => (
    <>
      <Header />
      <div className="pl-split">
        <Rows count={5} from={3} />
        <div className="pl-stack">
          <Bone className="skeleton--tile" i={4} />
          <Bone className="skeleton--tile skeleton--tile-sm" i={5} />
        </div>
      </div>
    </>
  ),
  achievements: () => (
    <>
      <Header />
      <div className="pl-grid pl-grid--3">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <Bone key={n} className="skeleton--card" i={3 + n} />
        ))}
      </div>
    </>
  ),
  coach: () => (
    <>
      <Header />
      <div className="pl-chat">
        <Bone className="skeleton--bubble" w="58%" i={3} />
        <Bone className="skeleton--bubble pl-chat__mine" w="40%" i={4} />
        <Bone className="skeleton--bubble" w="66%" i={5} />
        <Bone className="skeleton--bubble pl-chat__mine" w="34%" i={6} />
        <Bone className="skeleton--input" i={7} />
      </div>
    </>
  ),
  profile: () => (
    <>
      <Header />
      <div className="pl-split">
        <div className="pl-stack">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className="pl-field">
              <Bone className="skeleton--line" w="24%" i={3 + n} />
              <Bone className="skeleton--input" i={3 + n} />
            </div>
          ))}
        </div>
        <Bone className="skeleton--tile skeleton--tile-tall" i={4} />
      </div>
    </>
  ),
  onboarding: () => (
    <div className="pl-center">
      <Bone className="skeleton--line" w="30%" i={0} />
      <Bone className="skeleton--title" w="80%" i={1} />
      <div className="pl-grid pl-grid--2">
        {[0, 1, 2, 3].map((n) => (
          <Bone key={n} className="skeleton--tile skeleton--tile-sm" i={2 + n} />
        ))}
      </div>
      <Bone className="skeleton--button skeleton--block" i={6} />
    </div>
  ),
};

/**
 * Carga de sección: la silueta de la pantalla que viene, con un brillo tenue que la recorre en diagonal
 * y aparición en cascada. Cuando llega el contenido, este entra con la misma cascada (`page-enter`),
 * así el paso de la silueta a la pantalla real se siente continuo. Con "menos movimiento" queda quieta.
 */
export function PageLoader({ layout = "home", label = "Preparando tu espacio" }: PageLoaderProps) {
  return (
    <div className={`page-loader page-loader--${layout}`} role="status" aria-live="polite" aria-busy="true" aria-label={label}>
      <div className="page-loader__brand" aria-hidden="true">
        <LogoMark size={28} decorative />
        <span className="page-loader__label">{label}</span>
        <span className="page-loader__progress" />
      </div>
      <div className="page-loader__ghost" aria-hidden="true">
        {LAYOUTS[layout]()}
      </div>
    </div>
  );
}
