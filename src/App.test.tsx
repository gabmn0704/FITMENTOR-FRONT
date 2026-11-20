import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEYS } from "./lib/storage";

describe("App", () => {
  /** Sin backend en las pruebas: `/me` responde con la misma persona guardada y lo demás, vacío. */
  function stubBackend(user: { id: string; name: string; guest: boolean }) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes("/me") ? user : [];
        return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
      }),
    );
  }

  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("muestra el acceso como invitado cuando no hay sesión", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: "Entrar como invitado" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
  });

  it("muestra el shell con navegación cuando hay token guardado", async () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "test-token");
    window.localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({ id: "1", name: "Ana Pérez", guest: true }),
    );
    window.localStorage.setItem(
      `${STORAGE_KEYS.profile}.1`,
      JSON.stringify({ goal: "health", weightKg: 70, heightCm: 170, age: null, sex: null, targetWeightKg: null, weeks: 12, daysPerWeek: 3, diet: "omnivore", startedAt: "2026-10-01T00:00:00.000Z" }),
    );
    window.location.hash = "#/entrenar";
    stubBackend({ id: "1", name: "Ana Pérez", guest: true });
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación móvil" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: /Sentadilla/ })).toBeInTheDocument();
  });

  it("pide el perfil con el asistente cuando la persona aún no lo ha completado", async () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "test-token");
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ id: "7", name: "Luis", guest: false }));
    stubBackend({ id: "7", name: "Luis", guest: false });
    render(<App />);
    expect(await screen.findByText(/qué quieres lograr/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
  });
});
