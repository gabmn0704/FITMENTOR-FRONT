import { Camera, Check, Wind, X } from "lucide-react";
import { EXERCISES } from "../../lib/exercises";
import { FLOOR_Y, GUIDES, type PoseFrame } from "../../lib/exerciseGuide";
import type { ExerciseId } from "../../types";

const toPath = (points: ReadonlyArray<readonly [number, number]>) =>
  points.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ");

function Figure({ frame, label }: { frame: PoseFrame; label: string }) {
  return (
    <figure className={`pose${frame.wrong ? " pose--wrong" : ""}`}>
      <svg viewBox="0 0 200 160" role="img" aria-label={label}>
        <line className="pose__floor" x1="8" x2="192" y1={FLOOR_Y} y2={FLOOR_Y} />
        {frame.bar && (
          <g className="pose__bar">
            <line x1={frame.bar[0] - 30} x2={frame.bar[0] + 30} y1={frame.bar[1]} y2={frame.bar[1]} />
            <circle cx={frame.bar[0]} cy={frame.bar[1]} r="11" />
          </g>
        )}
        {frame.limbs.map((limb, index) => (
          <path key={index} className="pose__limb" d={toPath(limb)} />
        ))}
        <circle className="pose__head" cx={frame.head[0]} cy={frame.head[1]} r="8" />
        {frame.mark && (
          <g className="pose__mark">
            <circle cx={frame.mark.at[0]} cy={frame.mark.at[1]} r="6" />
            <text x={frame.mark.at[0] + (frame.mark.dx ?? 10)} y={frame.mark.at[1] - 8}>
              {frame.mark.label}
            </text>
          </g>
        )}
      </svg>
      <figcaption>
        {frame.wrong ? <X size={14} aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
        {frame.caption}
      </figcaption>
    </figure>
  );
}

/** Dibujo de las dos posiciones del ejercicio, con pasos, errores comunes y cómo colocarte ante la cámara. */
export function ExerciseGuide({ exercise, compact = false }: { exercise: ExerciseId; compact?: boolean }) {
  const guide = GUIDES[exercise];
  const name = EXERCISES[exercise].label;
  return (
    <div className={`guide${compact ? "" : " guide--wide"}`}>
      <div className="guide__frames">
        {guide.frames.map((frame) => (
          <Figure key={frame.caption} frame={frame} label={`${name}: ${frame.caption}`} />
        ))}
      </div>
      {!compact && (
        <div className="guide__text">
          <ol className="guide__steps">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="guide__split">
            <div>
              <h3>Evita</h3>
              <ul className="guide__mistakes">
                {guide.mistakes.map((mistake) => (
                  <li key={mistake}>
                    <X size={14} aria-hidden="true" />
                    {mistake}
                  </li>
                ))}
              </ul>
            </div>
            <div className="guide__tips">
              <p>
                <Wind size={15} aria-hidden="true" /> {guide.breath}
              </p>
              <p>
                <Camera size={15} aria-hidden="true" /> {guide.camera}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
