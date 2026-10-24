import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { STORAGE_KEYS } from "./lib/storage";

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = "";
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
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación móvil" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { level: 1, name: /Sentadilla/ })).toBeInTheDocument();
  });

  it("pide el perfil con el asistente cuando la persona aún no lo ha completado", async () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "test-token");
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ id: "7", name: "Luis", guest: false }));
    render(<App />);
    expect(await screen.findByText(/qué quieres lograr/i)).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
  });
});
