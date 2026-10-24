import type { BodyProfile } from "./profile";

/**
 * Alimentos con sus valores por 100 g, etiquetas de lo que alguien puede no comer y medidas caseras.
 * Los nombres y porciones son de uso común en Latinoamérica; los valores son aproximados (tablas generales).
 */

export type FoodRole = "protein" | "carb" | "fat" | "veg" | "fruit";
export type Avoid = "fish" | "dairy" | "eggs" | "gluten" | "pork";

export const AVOID_OPTIONS: ReadonlyArray<{ value: Avoid; label: string }> = [
  { value: "fish", label: "Pescado y mariscos" },
  { value: "dairy", label: "Lácteos" },
  { value: "eggs", label: "Huevo" },
  { value: "gluten", label: "Gluten" },
  { value: "pork", label: "Cerdo" },
];

export interface Food {
  id: string;
  name: string;
  /** Nombre corto para armar el nombre del plato ("pollo", "arroz"). */
  short: string;
  role: FoodRole;
  /** Por 100 g. */
  kcal: number;
  p: number;
  c: number;
  f: number;
  vegetarian: boolean;
  /** Qué debe evitar quien no pueda comerlo. */
  tags?: Avoid[];
  /** Medida casera: gramos por unidad y cómo nombrarla. */
  unit?: { grams: number; one: string; many: string };
}

const food = (
  id: string,
  name: string,
  short: string,
  role: FoodRole,
  kcal: number,
  p: number,
  c: number,
  f: number,
  options: { vegetarian?: boolean; tags?: Avoid[]; unit?: Food["unit"] } = {},
): Food => ({ id, name, short, role, kcal, p, c, f, vegetarian: options.vegetarian ?? true, tags: options.tags, unit: options.unit });

const LIST: Food[] = [
  // Proteínas animales
  food("pollo", "Pechuga de pollo cocida", "pollo", "protein", 165, 31, 0, 3.6, { vegetarian: false }),
  food("muslo", "Muslo de pollo sin piel cocido", "pollo", "protein", 177, 27, 0, 7.5, { vegetarian: false }),
  food("pavo", "Pechuga de pavo cocida", "pavo", "protein", 135, 30, 0, 1, { vegetarian: false }),
  food("res", "Carne de res magra cocida", "carne de res", "protein", 190, 29, 0, 8, { vegetarian: false }),
  food("cerdo", "Lomo de cerdo magro cocido", "cerdo", "protein", 143, 26, 0, 3.5, { vegetarian: false, tags: ["pork"] }),
  food("pescado", "Pescado blanco cocido", "pescado", "protein", 128, 26, 0, 2.7, { vegetarian: false, tags: ["fish"] }),
  food("atun", "Atún en agua", "atún", "protein", 116, 26, 0, 1, { vegetarian: false, tags: ["fish"] }),
  food("sardinas", "Sardinas en lata", "sardinas", "protein", 208, 25, 0, 11, { vegetarian: false, tags: ["fish"] }),
  food("camaron", "Camarones cocidos", "camarones", "protein", 99, 24, 0.2, 0.3, { vegetarian: false, tags: ["fish"] }),
  // Huevos y lácteos
  food("huevo", "Huevo", "huevos", "protein", 143, 12.6, 0.7, 9.5, { tags: ["eggs"], unit: { grams: 50, one: "huevo", many: "huevos" } }),
  food("claras", "Claras de huevo", "claras", "protein", 52, 11, 0.7, 0.2, { tags: ["eggs"] }),
  food("yogur", "Yogur griego natural", "yogur", "protein", 59, 10, 3.6, 0.4, { tags: ["dairy"] }),
  food("cottage", "Queso cottage", "queso cottage", "protein", 98, 11, 3.4, 4.3, { tags: ["dairy"] }),
  food("queso", "Queso fresco bajo en grasa", "queso fresco", "protein", 174, 18, 3, 10, { tags: ["dairy"] }),
  // Proteínas vegetales
  food("tofu", "Tofu firme", "tofu", "protein", 144, 17, 3, 9),
  food("tempeh", "Tempeh", "tempeh", "protein", 192, 20, 9, 11, { tags: ["gluten"] }),
  food("soya", "Soya texturizada hidratada", "soya", "protein", 95, 15, 8, 0.5),
  food("lentejas", "Lentejas cocidas", "lentejas", "protein", 116, 9, 20, 0.4),
  food("frijoles", "Frijoles cocidos", "frijoles", "protein", 127, 8.7, 23, 0.5),
  food("garbanzos", "Garbanzos cocidos", "garbanzos", "protein", 164, 8.9, 27, 2.6),

  // Carbohidratos
  food("arroz", "Arroz cocido", "arroz", "carb", 130, 2.7, 28, 0.3),
  food("arroz_int", "Arroz integral cocido", "arroz integral", "carb", 123, 2.7, 26, 1),
  food("avena", "Avena en hojuelas (en seco)", "avena", "carb", 389, 17, 66, 7, { tags: ["gluten"] }),
  food("papa", "Papa cocida", "papa", "carb", 87, 1.9, 20, 0.1),
  food("camote", "Camote cocido", "camote", "carb", 90, 2, 21, 0.1),
  food("yuca", "Yuca cocida", "yuca", "carb", 160, 1.4, 38, 0.3),
  food("platano", "Plátano maduro cocido", "plátano", "carb", 122, 1.3, 32, 0.4),
  food("choclo", "Maíz tierno (choclo) cocido", "choclo", "carb", 96, 3.4, 21, 1.5),
  food("pan", "Pan integral", "pan integral", "carb", 247, 13, 41, 3.4, { tags: ["gluten"], unit: { grams: 30, one: "rebanada", many: "rebanadas" } }),
  food("pita", "Pan pita integral", "pan pita", "carb", 262, 10, 52, 3, { tags: ["gluten"], unit: { grams: 60, one: "pan pita", many: "panes pita" } }),
  food("tortilla", "Tortilla de maíz", "tortillas de maíz", "carb", 218, 5.7, 45, 2.9, { unit: { grams: 30, one: "tortilla", many: "tortillas" } }),
  food("pasta", "Pasta integral cocida", "pasta", "carb", 158, 5.8, 31, 0.9, { tags: ["gluten"] }),
  food("cuscus", "Cuscús cocido", "cuscús", "carb", 112, 3.8, 23, 0.2, { tags: ["gluten"] }),
  food("quinoa", "Quinoa cocida", "quinoa", "carb", 120, 4.4, 21, 1.9),

  // Frutas
  food("banano", "Banano", "banano", "fruit", 89, 1.1, 23, 0.3, { unit: { grams: 120, one: "banano", many: "bananos" } }),
  food("manzana", "Manzana", "manzana", "fruit", 52, 0.3, 14, 0.2, { unit: { grams: 180, one: "manzana", many: "manzanas" } }),
  food("pera", "Pera", "pera", "fruit", 57, 0.4, 15, 0.1, { unit: { grams: 170, one: "pera", many: "peras" } }),
  food("naranja", "Naranja", "naranja", "fruit", 47, 0.9, 12, 0.1, { unit: { grams: 130, one: "naranja", many: "naranjas" } }),
  food("kiwi", "Kiwi", "kiwi", "fruit", 61, 1.1, 15, 0.5, { unit: { grams: 75, one: "kiwi", many: "kiwis" } }),
  food("fresas", "Fresas", "fresas", "fruit", 32, 0.7, 7.7, 0.3),
  food("papaya", "Papaya", "papaya", "fruit", 43, 0.5, 11, 0.3),
  food("pina", "Piña", "piña", "fruit", 50, 0.5, 13, 0.1),
  food("mango", "Mango", "mango", "fruit", 60, 0.8, 15, 0.4),
  food("uvas", "Uvas", "uvas", "fruit", 69, 0.7, 18, 0.2),
  food("sandia", "Sandía", "sandía", "fruit", 30, 0.6, 8, 0.2),

  // Grasas
  food("aceite", "Aceite de oliva", "aceite de oliva", "fat", 884, 0, 0, 100, { unit: { grams: 5, one: "cucharadita", many: "cucharaditas" } }),
  food("aguacate", "Aguacate", "aguacate", "fat", 160, 2, 9, 15),
  food("almendras", "Almendras", "almendras", "fat", 579, 21, 22, 50),
  food("nueces", "Nueces", "nueces", "fat", 654, 15, 14, 65),
  food("mani", "Maní natural", "maní", "fat", 567, 26, 16, 49),
  food("chia", "Semillas de chía", "chía", "fat", 486, 17, 42, 31),

  // Verduras (cada una acompaña con un aire distinto)
  food("ensalada", "Ensalada de lechuga y tomate", "ensalada", "veg", 20, 1.2, 4, 0.2),
  food("brocoli", "Brócoli al vapor", "brócoli", "veg", 35, 2.8, 7, 0.4),
  food("espinaca", "Espinaca salteada", "espinaca", "veg", 23, 2.9, 3.6, 0.4),
  food("zanahoria", "Zanahoria y ejotes", "verduras salteadas", "veg", 38, 1.5, 8.5, 0.2),
  food("calabacin", "Calabacín y pimentón", "verduras al horno", "veg", 22, 1.4, 4.5, 0.3),
  food("coliflor", "Coliflor al vapor", "coliflor", "veg", 25, 1.9, 5, 0.3),
];

export const FOODS: Record<string, Food> = Object.fromEntries(LIST.map((item) => [item.id, item]));

/** Ración máxima razonable por alimento, en gramos (nadie se toma casi un litro de leche de una vez). */
export const MAX_GRAMS: Record<string, number> = {
  pollo: 220, muslo: 220, pavo: 220, res: 200, cerdo: 200, pescado: 250, atun: 150, sardinas: 140, camaron: 220,
  huevo: 200, claras: 250, yogur: 300, cottage: 250, queso: 120, tofu: 250, tempeh: 160, soya: 250,
  lentejas: 300, frijoles: 300, garbanzos: 300,
};

/** Verdadero si la persona puede comer el alimento según su tipo de alimentación y lo que evita. */
export function isAllowed(item: Food, diet: BodyProfile["diet"], avoid: readonly Avoid[]): boolean {
  if (diet === "vegetarian" && !item.vegetarian) return false;
  return !(item.tags ?? []).some((tag) => avoid.includes(tag));
}
