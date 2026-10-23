export const ROUTES = [
  { id: "inicio", label: "Inicio" },
  { id: "entrenar", label: "Entrenar" },
  { id: "progreso", label: "Progreso" },
  { id: "rutina", label: "Rutina IA" },
  { id: "logros", label: "Logros" },
  { id: "coach", label: "Coach IA" },
  { id: "perfil", label: "Perfil" },
] as const;

export type RouteId = (typeof ROUTES)[number]["id"];

export const DEFAULT_ROUTE: RouteId = "inicio";

export function isRouteId(value: string): value is RouteId {
  return ROUTES.some((route) => route.id === value);
}

/** Lee la ruta desde el hash (#/entrenar). Cualquier valor desconocido cae en inicio. */
export function parseRoute(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, "").split(/[?/]/)[0] ?? "";
  return isRouteId(id) ? id : DEFAULT_ROUTE;
}

export function routeHref(id: RouteId): string {
  return `#/${id}`;
}
