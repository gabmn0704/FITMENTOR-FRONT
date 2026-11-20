/** Estados de "Rep", la mascota de FitMentor, y sus frases en español colombiano. */
export type MascotState = "idle" | "wave" | "cheer" | "count" | "rest" | "celebrate" | "worried";

export const MASCOT_STATES: MascotState[] = ["idle", "wave", "cheer", "count", "rest", "celebrate", "worried"];

export const MASCOT_NAME = "Rep";

export const MASCOT_PHRASES: Record<MascotState, string[]> = {
  idle: [
    "¿Listo para sudar la camiseta?",
    "Hoy es buen día para moverse, parce.",
    "Yo cuento, usted se luce.",
    "Pa' lante, que el cuerpo responde.",
  ],
  wave: [
    "¡Quiubo! Qué bueno verlo por acá.",
    "¡Bienvenido de nuevo, campeón!",
    "¡Hola, hola! Vamos a entrenar bonito.",
    "¡Ey! Estaba esperándolo.",
  ],
  cheer: [
    "¡Dele con toda, que usted puede!",
    "¡Eso es, mi rey, así se hace!",
    "¡Qué nota esa técnica!",
    "¡Hágale pues, sin pereza!",
  ],
  count: [
    "Yo llevo la cuenta, usted concéntrese.",
    "Una más y ya, ¡sin trampa!",
    "Bajando controlado, subiendo con fuerza.",
    "Cuenta limpia, repetición limpia.",
  ],
  rest: [
    "Respire profundo y tome agüita.",
    "Descanse tranquilo, que lo bueno se gana.",
    "Hidrátese, estire un poquito.",
    "El músculo crece cuando uno descansa.",
  ],
  celebrate: [
    "¡Lo logró! ¡Qué chimba de sesión!",
    "¡Eso, crack! Otro logro pa' la colección.",
    "¡Tenemos fiesta! Usted es una máquina.",
    "¡Brutal! Hoy sí que se ganó el postre.",
  ],
  worried: [
    "Tranqui, un mal día no borra el progreso.",
    "Ánimo, parce, mañana lo hacemos mejor.",
    "Hey, sin afán. Empecemos suave.",
    "No pasa nada, aquí estoy con usted.",
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
