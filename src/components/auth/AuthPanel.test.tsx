import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../App";
import { passwordStrength, validateCredentials } from "./AuthPanel";

describe("validateCredentials", () => {
  it("exige nombre solo al registrarse", () => {
    expect(validateCredentials("register", " ", "a@b.co", "12345678")).toMatch(/nombre/i);
    expect(validateCredentials("login", "", "a@b.co", "x")).toBeNull();
  });

  it("valida correo y longitud de contraseña", () => {
    expect(validateCredentials("login", "", "no-es-correo", "x")).toMatch(/correo/i);
    expect(validateCredentials("register", "Ana", "a@b.co", "corta")).toMatch(/8 caracteres/);
    expect(validateCredentials("register", "Ana", "a@b.co", "12345678")).toBeNull();
  });
});

describe("Pantalla de acceso", () => {
  it("permite cambiar entre entrar y crear cuenta", () => {
    window.localStorage.clear();
    render(<App />);
    fireEvent.click(screen.getByRole("tab", { name: "Crear cuenta" }));
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear mi cuenta" })).toBeInTheDocument();
  });
});

describe("passwordStrength", () => {
  it("sube con la longitud y la variedad", () => {
    expect(passwordStrength("")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("Abcdefgh1234")).toBe(3);
    expect(passwordStrength("Abcdefgh1234!")).toBe(4);
  });
});
