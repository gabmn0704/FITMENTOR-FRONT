import { describe, expect, it } from "vitest";
import { coachSourceLabel, isGuest, levelLabel, LIMITS, normalizeUser, toCoachSource, toGoal, toLevel } from "./contract";
import { ApiError, apiRequest, errorCodeOf, errorMessageFor, parseRetryAfter } from "./api";
import { afterEach, vi } from "vitest";

describe("contrato del backend", () => {
  it("traduce niveles del enum a etiquetas en español", () => {
    expect(levelLabel("BEGINNER")).toBe("Principiante");
    expect(levelLabel("INTERMEDIATE")).toBe("Intermedio");
    expect(levelLabel("ADVANCED")).toBe("Avanzado");
    expect(toLevel("intermedio")).toBe("INTERMEDIATE");
    expect(toLevel("desconocido")).toBe("BEGINNER");
  });

  it("normaliza el usuario guardado con valores antiguos", () => {
    const user = normalizeUser({ id: "1", name: "Ana", email: "a@b.com", level: "avanzado", goal: "fuerza" } as never);
    expect(user.level).toBe("ADVANCED");
    expect(user.goal).toBe("strength");
    expect(toGoal("movilidad")).toBe("mobility");
  });

  it("usa el campo guest y, si falta, el correo", () => {
    expect(isGuest({ email: "x@gmail.com", guest: true })).toBe(true);
    expect(isGuest({ email: "x@gmail.com", guest: false })).toBe(false);
    expect(isGuest({ email: "guest-123@users.guest.local" })).toBe(true);
    expect(isGuest({ email: null })).toBe(true);
  });

  it("mapea fuentes del coach a texto visible", () => {
    expect(coachSourceLabel("claude")).toBe("Coach IA");
    expect(coachSourceLabel("rules")).toBe("Guía de técnica");
    expect(coachSourceLabel("fallback")).toBeUndefined();
    expect(coachSourceLabel("otra")).toBeUndefined();
    expect(toCoachSource("claude")).toBe("claude");
    expect(toCoachSource("rules")).toBe("rules");
    expect(toCoachSource(undefined)).toBe("rules");
  });

  it("expone los límites que valida el backend", () => {
    expect(LIMITS.coachQuestion).toBe(500);
    expect(LIMITS.coachContext).toBe(4000);
    expect(LIMITS.userName).toBe(120);
  });

  it("traduce errores JSON del API a mensajes en español", () => {
    expect(errorMessageFor(401, '{"error":"UNAUTHORIZED","message":"Token expired"}')).toBe(
      "Tu sesión caducó. Vuelve a iniciar sesión.",
    );
    expect(errorMessageFor(400, '{"error":"VALIDATION_ERROR","message":"name: must not be blank"}')).toBe(
      "Algunos datos no son válidos. Revísalos e inténtalo de nuevo.",
    );
    expect(errorMessageFor(500, "")).toBe("El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.");
  });

  it("usa los códigos en minúsculas del backend", () => {
    expect(errorCodeOf('{"error":"rate_limited"}')).toBe("rate_limited");
    expect(errorCodeOf("<html>")).toBe("");
    expect(errorMessageFor(400, '{"error":"validation_error","message":"question must be at most 500 characters"}')).toBe(
      "Algunos datos no son válidos. Revísalos e inténtalo de nuevo.",
    );
    expect(errorMessageFor(401, '{"error":"invalid_google_token"}', { authenticated: false })).toBe(
      "No pudimos verificar tu cuenta de Google. Inténtalo de nuevo.",
    );
    expect(errorMessageFor(503, '{"error":"google_not_configured"}')).toMatch(/Google no está disponible/);
    expect(errorMessageFor(401, "", { authenticated: false })).toBe("No pudimos iniciar sesión. Inténtalo de nuevo.");
  });

  it("explica el 429 con el tiempo de Retry-After", () => {
    expect(errorMessageFor(429, '{"error":"rate_limited"}', { retryAfter: 42 })).toBe(
      "Has hecho demasiadas solicitudes seguidas. Vuelve a intentarlo en 42 s.",
    );
    expect(errorMessageFor(429, '{"error":"rate_limited"}', { retryAfter: 90 })).toMatch(/2 min/);
    expect(errorMessageFor(429, "")).toMatch(/Espera un momento/);
    expect(parseRetryAfter("30")).toBe(30);
    expect(parseRetryAfter("0")).toBe(1);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("mañana")).toBeNull();
    const now = Date.parse("2026-10-21T10:00:00Z");
    expect(parseRetryAfter("Wed, 21 Oct 2026 10:00:20 GMT", now)).toBe(20);
  });
});

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

  it("comparte GET idénticos en vuelo", async () => {
    const fetchMock = vi.fn(async () => json(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([apiRequest("/api/x", { token: "t" }), apiRequest("/api/x", { token: "t" })]);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reintenta una vez un GET con 5xx", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(500, { error: "internal_error" }))
      .mockResolvedValueOnce(json(200, [1]));
    vi.stubGlobal("fetch", fetchMock);
    await expect(apiRequest("/api/achievements", { token: "t" })).resolves.toEqual([1]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("no reintenta un POST y lee Retry-After en el 429", async () => {
    const fetchMock = vi.fn(async () => json(429, { error: "rate_limited" }, { "Retry-After": "17" }));
    vi.stubGlobal("fetch", fetchMock);
    const error = (await apiRequest("/api/coach", { method: "POST", body: { question: "x" }, token: "t" }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(429);
    expect(error.code).toBe("rate_limited");
    expect(error.retryAfter).toBe(17);
    expect(error.message).toMatch(/17 s/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
