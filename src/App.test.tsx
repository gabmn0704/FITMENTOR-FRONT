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

  it("muestra el shell con navegación cuando hay token guardado", () => {
    window.localStorage.setItem(STORAGE_KEYS.token, "test-token");
    window.localStorage.setItem(
      STORAGE_KEYS.user,
      JSON.stringify({ id: "1", name: "Ana Pérez", guest: true }),
    );
    window.location.hash = "#/entrenar";
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Navegación principal" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navegación móvil" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /Sentadilla/ })).toBeInTheDocument();
  });
});
