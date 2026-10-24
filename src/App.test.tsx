import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { STORAGE_KEYS } from "./lib/storage";

describe("App", () => {
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

  it("muestra el shell con navegación cuando hay token guardado", () => {
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
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación móvil" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /Sentadilla/ })).toBeInTheDocument();
  });

  it("abre el asistente del plan justo al iniciar sesión, no antes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ token: "t", user: { id: "7", name: "Luis", guest: true, level: "BEGINNER" } }), { status: 200 })),
    );
    render(<App />);
    expect(screen.queryByText(/qué quieres lograr/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Entrar como invitado/i }));
    await waitFor(() => expect(screen.getByText(/qué quieres lograr/i)).toBeInTheDocument());
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
  });

  it("con una sesión ya guardada entra directo y ofrece crear el plan", () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "test-token");
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ id: "7", name: "Luis", guest: false }));
    render(<App />);
    expect(screen.queryByText(/qué quieres lograr/i)).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Crear mi plan/i })).toBeInTheDocument();
  });
});
