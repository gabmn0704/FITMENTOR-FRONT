import { bmi, goalUsesTargetWeight, type BodyProfile, type FitnessGoal } from "./profile";

/**
 * Cálculo de calorías, macros y comidas a partir del perfil. Las cuentas son estándar (Mifflin-St Jeor para el
 * metabolismo basal) y siempre se limitan a ritmos seguros: es orientación general, no consejo médico.
 */

const KCAL_PER_KG = 7700;

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionTargets extends Macros {
  bmr: number;
  tdee: number;
  /** Cambio de peso semanal buscado, en kg (negativo al bajar). */
  weeklyChangeKg: number;
  waterL: number;
  /** Avisos sobre el plazo o el ritmo, en español, para mostrar a la persona. */
  notes: string[];
}

/** Metabolismo basal (kcal/día) con Mifflin-St Jeor; sin sexo se promedia. */
export function bmr(profile: Pick<BodyProfile, "weightKg" | "heightCm" | "age" | "sex">): number {
  const age = profile.age ?? 30;
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * age;
  const offset = profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  return Math.round(base + offset);
}

/** Gasto diario total: el metabolismo basal por un factor que crece con los días de entrenamiento. */
export function tdee(profile: Pick<BodyProfile, "weightKg" | "heightCm" | "age" | "sex" | "daysPerWeek">): number {
  const factor = 1.2 + 0.075 * profile.daysPerWeek;
  return Math.round(bmr(profile) * factor);
}

const PROTEIN_PER_KG: Record<FitnessGoal, number> = {
  lose_fat: 2.0,
  build_muscle: 1.9,
  tone: 1.9,
  endurance: 1.5,
  health: 1.4,
};

const round5 = (value: number) => Math.round(value / 5) * 5;

function kcalFloor(sex: BodyProfile["sex"]): number {
  return sex === "male" ? 1500 : sex === "female" ? 1200 : 1350;
}

/** Meta diaria de calorías y macros para un día de entrenamiento (o de descanso, con menos carbohidrato). */
export function nutritionTargets(profile: BodyProfile, trainingDay = true): NutritionTargets {
  const notes: string[] = [];
  const maintenance = tdee(profile);
  let weeklyChangeKg = 0;
  let kcal = maintenance;

  if (profile.goal === "lose_fat" && profile.targetWeightKg !== null) {
    const wanted = (profile.weightKg - profile.targetWeightKg) / profile.weeks;
    const safeMax = Math.max(0.25, profile.weightKg * 0.01);
    const rate = Math.min(Math.max(wanted, 0.1), safeMax);
    if (wanted > safeMax) {
      const safeWeeks = Math.ceil((profile.weightKg - profile.targetWeightKg) / safeMax);
      notes.push(
        `Bajar ${(profile.weightKg - profile.targetWeightKg).toFixed(1)} kg en ${profile.weeks} semanas es demasiado rápido. ` +
          `Usamos un ritmo seguro de ${safeMax.toFixed(2)} kg por semana: llegarías en unas ${safeWeeks} semanas.`,
      );
    }
    weeklyChangeKg = -rate;
    const deficit = Math.min((rate * KCAL_PER_KG) / 7, maintenance * 0.25);
    kcal = maintenance - deficit;
  } else if (profile.goal === "build_muscle" && profile.targetWeightKg !== null) {
    const wanted = (profile.targetWeightKg - profile.weightKg) / profile.weeks;
    const safeMax = Math.max(0.2, profile.weightKg * 0.005);
    const rate = Math.min(Math.max(wanted, 0.1), safeMax);
    if (wanted > safeMax) {
      const safeWeeks = Math.ceil((profile.targetWeightKg - profile.weightKg) / safeMax);
      notes.push(
        `Subir ${(profile.targetWeightKg - profile.weightKg).toFixed(1)} kg en ${profile.weeks} semanas añadiría más grasa que músculo. ` +
          `Usamos ${safeMax.toFixed(2)} kg por semana: llegarías en unas ${safeWeeks} semanas.`,
      );
    }
    weeklyChangeKg = rate;
    const surplus = Math.min((rate * KCAL_PER_KG) / 7, maintenance * 0.2);
    kcal = maintenance + Math.max(surplus, 150);
  } else if (profile.goal === "tone") {
    kcal = maintenance * 0.92;
    weeklyChangeKg = -((maintenance - kcal) * 7) / KCAL_PER_KG;
    notes.push("Déficit suave para definir sin perder rendimiento: el cambio se ve más en la forma que en la báscula.");
  } else if (profile.goal === "endurance") {
    kcal = maintenance * 1.05;
  }

  const floor = kcalFloor(profile.sex);
  if (kcal < floor) {
    kcal = floor;
    notes.push(`Subimos las calorías al mínimo seguro de ${floor} kcal. Por debajo de eso no es recomendable sin supervisión médica.`);
  }

  // Día de descanso: algo menos de carbohidrato (≈ 8 % de las calorías).
  const dayKcal = trainingDay ? kcal : kcal * 0.92;

  const proteinG = Math.round(PROTEIN_PER_KG[profile.goal] * profile.weightKg);
  const fatG = Math.round(Math.max(0.7 * profile.weightKg, (dayKcal * 0.27) / 9));
  const carbsG = Math.max(60, Math.round((dayKcal - proteinG * 4 - fatG * 9) / 4));
  const total = Math.round(proteinG * 4 + carbsG * 4 + fatG * 9);

  const value = bmi(profile);
  if (value < 18.5 && profile.goal === "lose_fat") {
    notes.push("Tu índice de masa corporal ya es bajo: conviene hablar con un profesional de la salud antes de buscar bajar de peso.");
  }
  if (goalUsesTargetWeight(profile.goal) === false && profile.targetWeightKg !== null) {
    notes.push("Para este objetivo no hace falta un peso meta; el plan se centra en el rendimiento.");
  }

  return {
    kcal: round5(total),
    proteinG,
    carbsG,
    fatG,
    bmr: bmr(profile),
    tdee: maintenance,
    weeklyChangeKg: Math.round(weeklyChangeKg * 100) / 100,
    waterL: Math.round((profile.weightKg * 0.035 + (trainingDay ? 0.5 : 0)) * 10) / 10,
    notes,
  };
}

/* ------------------------------ Alimentos ------------------------------ */

type FoodRole = "protein" | "carb" | "fat" | "veg" | "fruit";

interface Food {
  id: string;
  name: string;
  role: FoodRole;
  /** Por 100 g. */
  kcal: number;
  p: number;
  c: number;
  f: number;
  vegetarian: boolean;
  /** Medida casera: gramos por unidad y cómo nombrarla. */
  unit?: { grams: number; one: string; many: string };
  /** Se come crudo/seco (la ración se anota en peso en seco). */
  dry?: boolean;
}

const FOODS: Record<string, Food> = {
  pollo: { id: "pollo", name: "Pechuga de pollo cocida", role: "protein", kcal: 165, p: 31, c: 0, f: 3.6, vegetarian: false },
  pescado: { id: "pescado", name: "Pescado blanco cocido", role: "protein", kcal: 128, p: 26, c: 0, f: 2.7, vegetarian: false },
  atun: { id: "atun", name: "Atún en agua", role: "protein", kcal: 116, p: 26, c: 0, f: 1, vegetarian: false },
  res: { id: "res", name: "Carne de res magra cocida", role: "protein", kcal: 190, p: 29, c: 0, f: 8, vegetarian: false },
  huevo: { id: "huevo", name: "Huevo", role: "protein", kcal: 143, p: 12.6, c: 0.7, f: 9.5, vegetarian: true, unit: { grams: 50, one: "huevo", many: "huevos" } },
  claras: { id: "claras", name: "Claras de huevo", role: "protein", kcal: 52, p: 11, c: 0.7, f: 0.2, vegetarian: true },
  yogur: { id: "yogur", name: "Yogur griego natural", role: "protein", kcal: 59, p: 10, c: 3.6, f: 0.4, vegetarian: true },
  cottage: { id: "cottage", name: "Queso cottage", role: "protein", kcal: 98, p: 11, c: 3.4, f: 4.3, vegetarian: true },
  tofu: { id: "tofu", name: "Tofu firme", role: "protein", kcal: 144, p: 17, c: 3, f: 9, vegetarian: true },
  lentejas: { id: "lentejas", name: "Lentejas cocidas", role: "protein", kcal: 116, p: 9, c: 20, f: 0.4, vegetarian: true },
  frijoles: { id: "frijoles", name: "Frijoles cocidos", role: "protein", kcal: 127, p: 8.7, c: 23, f: 0.5, vegetarian: true },
  garbanzos: { id: "garbanzos", name: "Garbanzos cocidos", role: "protein", kcal: 164, p: 8.9, c: 27, f: 2.6, vegetarian: true },

  arroz: { id: "arroz", name: "Arroz cocido", role: "carb", kcal: 130, p: 2.7, c: 28, f: 0.3, vegetarian: true },
  avena: { id: "avena", name: "Avena en hojuelas (en seco)", role: "carb", kcal: 389, p: 17, c: 66, f: 7, vegetarian: true, dry: true },
  papa: { id: "papa", name: "Papa cocida", role: "carb", kcal: 87, p: 1.9, c: 20, f: 0.1, vegetarian: true },
  camote: { id: "camote", name: "Camote cocido", role: "carb", kcal: 90, p: 2, c: 21, f: 0.1, vegetarian: true },
  pan: { id: "pan", name: "Pan integral", role: "carb", kcal: 247, p: 13, c: 41, f: 3.4, vegetarian: true, unit: { grams: 30, one: "rebanada", many: "rebanadas" } },
  tortilla: { id: "tortilla", name: "Tortilla de maíz", role: "carb", kcal: 218, p: 5.7, c: 45, f: 2.9, vegetarian: true, unit: { grams: 30, one: "tortilla", many: "tortillas" } },
  pasta: { id: "pasta", name: "Pasta integral cocida", role: "carb", kcal: 158, p: 5.8, c: 31, f: 0.9, vegetarian: true },
  quinoa: { id: "quinoa", name: "Quinoa cocida", role: "carb", kcal: 120, p: 4.4, c: 21, f: 1.9, vegetarian: true },
  yuca: { id: "yuca", name: "Yuca cocida", role: "carb", kcal: 160, p: 1.4, c: 38, f: 0.3, vegetarian: true },

  banano: { id: "banano", name: "Banano", role: "fruit", kcal: 89, p: 1.1, c: 23, f: 0.3, vegetarian: true, unit: { grams: 120, one: "banano", many: "bananos" } },
  manzana: { id: "manzana", name: "Manzana", role: "fruit", kcal: 52, p: 0.3, c: 14, f: 0.2, vegetarian: true, unit: { grams: 180, one: "manzana", many: "manzanas" } },
  fresas: { id: "fresas", name: "Fresas", role: "fruit", kcal: 32, p: 0.7, c: 7.7, f: 0.3, vegetarian: true },

  aceite: { id: "aceite", name: "Aceite de oliva", role: "fat", kcal: 884, p: 0, c: 0, f: 100, vegetarian: true, unit: { grams: 5, one: "cucharadita", many: "cucharaditas" } },
  aguacate: { id: "aguacate", name: "Aguacate", role: "fat", kcal: 160, p: 2, c: 9, f: 15, vegetarian: true },
  almendras: { id: "almendras", name: "Almendras", role: "fat", kcal: 579, p: 21, c: 22, f: 50, vegetarian: true },
  mani: { id: "mani", name: "Maní natural", role: "fat", kcal: 567, p: 26, c: 16, f: 49, vegetarian: true },

  verduras: { id: "verduras", name: "Verduras y ensalada", role: "veg", kcal: 25, p: 1.5, c: 5, f: 0.2, vegetarian: true },
};

export interface MealItem {
  name: string;
  /** Texto listo para mostrar, por ejemplo "2 huevos (100 g)". */
  amount: string;
  grams: number;
}

export interface Meal extends Macros {
  slot: "desayuno" | "almuerzo" | "merienda" | "post" | "cena";
  title: string;
  items: MealItem[];
}

export interface DayMeals {
  meals: Meal[];
  total: Macros;
  targets: NutritionTargets;
  /** "entreno" o "descanso": cambia el reparto de carbohidratos. */
  kind: "training" | "rest";
}

const sum = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal,
  proteinG: a.proteinG + b.proteinG,
  carbsG: a.carbsG + b.carbsG,
  fatG: a.fatG + b.fatG,
});

const macrosOf = (food: Food, grams: number): Macros => ({
  kcal: (food.kcal * grams) / 100,
  proteinG: (food.p * grams) / 100,
  carbsG: (food.c * grams) / 100,
  fatG: (food.f * grams) / 100,
});

function roundGrams(food: Food, grams: number): number {
  if (food.role === "fruit" && food.unit) {
    const half = food.unit.grams / 2;
    return Math.max(1, Math.round(grams / half)) * half;
  }
  if (food.unit && food.unit.grams >= 30 && food.id !== "aguacate") {
    return Math.max(1, Math.round(grams / food.unit.grams)) * food.unit.grams;
  }
  if (food.id === "aceite") return Math.max(5, Math.round(grams / 5) * 5);
  return grams >= 200 ? Math.round(grams / 10) * 10 : Math.max(5, Math.round(grams / 5) * 5);
}

function describe(food: Food, grams: number): MealItem {
  if (food.role === "fruit" && food.unit) {
    const count = grams / food.unit.grams;
    const whole = Math.floor(count);
    const text = whole === 0 ? "½" : count % 1 ? `${whole}½` : String(whole);
    return { name: food.name, grams, amount: `${text} ${count <= 1 ? food.unit.one : food.unit.many} (${grams} g)` };
  }
  if (food.unit && food.unit.grams >= 30) {
    const count = Math.round(grams / food.unit.grams);
    return { name: food.name, grams, amount: `${count} ${count === 1 ? food.unit.one : food.unit.many} (${grams} g)` };
  }
  if (food.id === "aceite") {
    const spoons = Math.round(grams / 5);
    return { name: food.name, grams, amount: `${spoons} ${spoons === 1 ? "cucharadita" : "cucharaditas"} (${grams} g)` };
  }
  return { name: food.name, grams, amount: `${grams} g` };
}

type Slot = Meal["slot"];

interface SlotRule {
  title: string;
  /** Parte de las calorías del día (en día de entreno; en descanso la merienda absorbe el post-entreno). */
  share: number;
  proteins: string[];
  carbs: string[];
  fruit?: string[];
  fat?: string[];
  veg: boolean;
  /** Fracción de la proteína del día que se reparte aquí. */
  proteinShare: number;
  /** Proteína de apoyo cuando la principal, por tamaño de ración, no llega a la meta. */
  topUp?: string;
}

const SLOT_RULES: Record<Slot, SlotRule> = {
  desayuno: {
    title: "Desayuno",
    share: 0.24,
    proteins: ["huevo", "yogur", "cottage", "claras"],
    carbs: ["avena", "pan", "tortilla"],
    fruit: ["banano", "manzana", "fresas"],
    fat: ["almendras", "mani"],
    veg: false,
    proteinShare: 0.24,
    topUp: "claras",
  },
  almuerzo: {
    title: "Almuerzo",
    share: 0.3,
    proteins: ["pollo", "pescado", "res", "atun", "lentejas", "frijoles", "garbanzos", "tofu"],
    carbs: ["arroz", "papa", "camote", "pasta", "quinoa", "yuca"],
    fat: ["aceite", "aguacate"],
    veg: true,
    proteinShare: 0.32,
    topUp: "huevo",
  },
  merienda: {
    title: "Merienda",
    share: 0.12,
    proteins: ["yogur", "cottage"],
    carbs: ["avena"],
    fruit: ["manzana", "fresas", "banano"],
    fat: ["almendras", "mani"],
    veg: false,
    proteinShare: 0.10,
    topUp: "yogur",
  },
  post: {
    title: "Después de entrenar",
    share: 0.14,
    proteins: ["yogur", "huevo"],
    carbs: ["banano", "arroz", "pan"],
    veg: false,
    proteinShare: 0.16,
    topUp: "yogur",
  },
  cena: {
    title: "Cena",
    share: 0.2,
    proteins: ["pescado", "pollo", "huevo", "tofu", "lentejas", "atun", "garbanzos", "frijoles"],
    carbs: ["papa", "camote", "arroz", "tortilla", "quinoa"],
    fat: ["aceite", "aguacate"],
    veg: true,
    proteinShare: 0.18,
    topUp: "huevo",
  },
};

function pick(options: string[], diet: BodyProfile["diet"], seed: number): Food {
  const usable = options.map((id) => FOODS[id]).filter((food) => diet === "omnivore" || food.vegetarian);
  const list = usable.length ? usable : [FOODS.tofu];
  return list[seed % list.length];
}

/** Ración máxima razonable por alimento, en gramos (nadie se toma casi un litro de leche de una vez). */
const MAX_GRAMS: Record<string, number> = {
  pollo: 220,
  pescado: 250,
  atun: 150,
  res: 200,
  huevo: 200,
  claras: 250,
  yogur: 300,
  cottage: 250,
  tofu: 250,
  lentejas: 300,
  frijoles: 300,
  garbanzos: 300,
};

interface Entry {
  food: Food;
  grams: number;
}

const totalOf = (entries: Entry[]): Macros =>
  entries.reduce<Macros>((acc, entry) => sum(acc, macrosOf(entry.food, entry.grams)), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });

/** Arma una comida que se acerca a la meta de calorías y proteína del hueco. */
function buildMeal(slot: Slot, target: Macros, diet: BodyProfile["diet"], seed: number): Meal {
  const rule = SLOT_RULES[slot];
  const entries: Entry[] = [];
  const add = (food: Food, grams: number): Entry => {
    const entry = { food, grams };
    entries.push(entry);
    return entry;
  };

  if (rule.veg) add(FOODS.verduras, 150);

  const protein = pick(rule.proteins, diet, seed);
  const proteinNeeded = Math.max(0, target.proteinG - totalOf(entries).proteinG);
  const proteinEntry = add(protein, Math.min((proteinNeeded / protein.p) * 100, MAX_GRAMS[protein.id] ?? 250));

  // Si la ración tope no llega a la proteína del hueco, se completa con un alimento más denso en proteína.
  const shortfall = target.proteinG - totalOf(entries).proteinG;
  if (rule.topUp && shortfall > 8) {
    const support = FOODS[rule.topUp];
    if (support.id !== protein.id && (diet === "omnivore" || support.vegetarian)) {
      add(support, Math.min((shortfall / support.p) * 100, MAX_GRAMS[support.id] ?? 250));
    }
  }

  const carbFood = pick(rule.carbs, diet, seed + 1);
  const fruit = rule.fruit ? pick(rule.fruit, diet, seed + 2) : null;
  const carbNeeded = Math.max(0, target.carbsG - totalOf(entries).carbsG);
  let mainCarb: Entry | null = null;
  if (fruit && slot !== "post") {
    mainCarb = add(carbFood, ((carbNeeded * 0.6) / carbFood.c) * 100);
    add(fruit, ((carbNeeded * 0.4) / fruit.c) * 100);
  } else if (carbNeeded > 5) {
    mainCarb = add(carbFood, (carbNeeded / carbFood.c) * 100);
  }

  // La grasa se cuadra con su propia meta (no con las calorías que sobren), para que los macros salgan parejos.
  const fatLeft = target.fatG - totalOf(entries).fatG;
  if (rule.fat && fatLeft >= 3) {
    const fatFood = pick(rule.fat, diet, seed + 3);
    add(fatFood, Math.min((fatLeft / fatFood.f) * 100, fatFood.id === "aceite" ? 20 : 90));
  }

  // Los demás alimentos (cereal, legumbre, verdura) también aportan proteína: se descuenta de la ración principal.
  const othersProtein = totalOf(entries).proteinG - macrosOf(protein, proteinEntry.grams).proteinG;
  const tuned = (Math.max(0, target.proteinG - othersProtein) / protein.p) * 100;
  proteinEntry.grams = Math.min(MAX_GRAMS[protein.id] ?? 250, Math.max(proteinEntry.grams * 0.5, tuned));

  // Ajuste final de calorías con el carbohidrato principal (el grasa y la proteína ya están medidas).
  for (let pass = 0; pass < 3 && mainCarb; pass += 1) {
    const diff = target.kcal - totalOf(entries).kcal;
    if (Math.abs(diff) <= target.kcal * 0.04) break;
    mainCarb.grams = Math.min(450, Math.max(15, mainCarb.grams + (diff / mainCarb.food.kcal) * 100));
  }

  const items: MealItem[] = [];
  const rounded: Entry[] = entries.map((entry) => ({ food: entry.food, grams: roundGrams(entry.food, entry.grams) }));
  for (const entry of rounded) items.push(describe(entry.food, entry.grams));
  const total = totalOf(rounded);

  return {
    slot,
    title: rule.title,
    items,
    kcal: Math.round(total.kcal),
    proteinG: Math.round(total.proteinG),
    carbsG: Math.round(total.carbsG),
    fatG: Math.round(total.fatG),
  };
}

/**
 * Plan de comidas de un día. `seed` (por ejemplo el índice del día) rota los alimentos para que la semana
 * no repita el mismo menú. Los días de descanso no llevan comida post-entreno.
 */
export function mealPlanForDay(profile: BodyProfile, trainingDay: boolean, seed = 0): DayMeals {
  const targets = nutritionTargets(profile, trainingDay);
  const slots: Slot[] = trainingDay ? ["desayuno", "almuerzo", "merienda", "post", "cena"] : ["desayuno", "almuerzo", "merienda", "cena"];
  const shareTotal = slots.reduce((acc, slot) => acc + SLOT_RULES[slot].share, 0);
  const proteinTotal = slots.reduce((acc, slot) => acc + SLOT_RULES[slot].proteinShare, 0);

  const meals = slots.map((slot) => {
    const rule = SLOT_RULES[slot];
    const kcal = (targets.kcal * rule.share) / shareTotal;
    const proteinG = (targets.proteinG * rule.proteinShare) / proteinTotal;
    const fatG = (targets.fatG * rule.share) / shareTotal;
    const carbsG = Math.max(0, (kcal - proteinG * 4 - fatG * 9) / 4);
    return buildMeal(slot, { kcal, proteinG, carbsG, fatG }, profile.diet, seed + slots.indexOf(slot));
  });

  const total = meals.reduce<Macros>((acc, meal) => sum(acc, meal), { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  return { meals, total, targets, kind: trainingDay ? "training" : "rest" };
}

/** Consejo breve de qué comer justo después de entrenar, según el objetivo. */
export function postWorkoutTip(goal: FitnessGoal): string {
  switch (goal) {
    case "lose_fat":
      return "En la hora siguiente come proteína magra con verduras y algo de carbohidrato (arroz o papa): te ayuda a conservar el músculo sin pasarte de calorías.";
    case "build_muscle":
      return "En la hora siguiente toma 25 a 40 g de proteína con carbohidrato (yogur con banano, o arroz con pollo): es cuando más aprovecha el músculo.";
    case "endurance":
      return "Repón carbohidrato y líquidos en los primeros 30 a 60 minutos (banano, arroz, avena) y suma proteína para recuperarte.";
    case "tone":
      return "Combina 20 a 30 g de proteína con una porción moderada de carbohidrato: recuperas sin excederte.";
    default:
      return "Come algo con proteína y carbohidrato dentro de la hora siguiente y bebe agua para recuperarte bien.";
  }
}
