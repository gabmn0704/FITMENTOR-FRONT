import { describe, expect, it } from "vitest";
import { coachSourceLabel, isGuest, levelLabel, normalizeUser, toGoal, toLevel } from "./contract";
import { errorMessageFor } from "./api";

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
    expect(coachSourceLabel("otra")).toBeUndefined();
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
});
