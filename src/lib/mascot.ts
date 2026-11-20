/** Estados de "Rep", la mascota de FitMentor, y sus frases (tono neutro, claro y motivador). */
export type MascotState = "idle" | "wave" | "cheer" | "count" | "rest" | "celebrate" | "worried";

export const MASCOT_STATES: MascotState[] = ["idle", "wave", "cheer", "count", "rest", "celebrate", "worried"];

export const MASCOT_NAME = "Rep";

export const MASCOT_PHRASES: Record<MascotState, string[]> = {
  idle: [
    "Cuando quieras, empezamos.",
    "Hoy es un buen día para moverte.",
    "Tú haces el movimiento; yo llevo la cuenta.",
    "Paso a paso, el cuerpo responde.",
  ],
  wave: [
    "Hola, qué bueno verte de nuevo.",
    "Bienvenido de vuelta. Sigamos con tu plan.",
    "Hola. Preparemos tu próxima sesión.",
    "Te estaba esperando para entrenar.",
  ],
  cheer: [
    "Vas muy bien, mantén el ritmo.",
    "Así se hace. Buena técnica.",
    "Excelente control en cada repetición.",
    "Un esfuerzo más, tú puedes.",
  ],
  count: [
    "Yo llevo la cuenta; tú concéntrate en la técnica.",
    "Una más, con el mismo control.",
    "Baja controlado, sube con fuerza.",
    "Repetición limpia, cuenta limpia.",
  ],
  rest: [
    "Respira profundo y toma agua.",
    "Descansa: la recuperación también cuenta.",
    "Hidrátate y estira un poco.",
    "El músculo se fortalece mientras descansas.",
  ],
  celebrate: [
    "Sesión completada. Gran trabajo.",
    "Nuevo logro desbloqueado.",
    "Meta cumplida. Tu constancia da resultados.",
    "Excelente sesión. Te lo ganaste.",
  ],
  worried: [
    "Un mal día no borra tu progreso.",
    "Mañana lo hacemos mejor. Sigue adelante.",
    "Sin prisa. Empecemos suave.",
    "Aquí estoy para acompañarte.",
  ],
};

/** Elige una frase del estado; con `seed` es determinista (útil para pruebas y para "frase del día"). */
export function mascotPhrase(state: MascotState, seed?: number): string {
  const list = MASCOT_PHRASES[state];
  const index = seed === undefined ? Math.floor(Math.random() * list.length) : Math.abs(Math.floor(seed)) % list.length;
  return list[index];
}

export const MASCOT_LABELS: Record<MascotState, string> = {
  idle: "en calma",
  wave: "saludando",
  cheer: "animando",
  count: "contando repeticiones",
  rest: "descansando",
  celebrate: "celebrando",
  worried: "preocupado",
};
