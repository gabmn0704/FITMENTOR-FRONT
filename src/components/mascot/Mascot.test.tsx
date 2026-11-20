import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Mascot } from "./Mascot";
import { MASCOT_STATES } from "../../lib/mascot";
import { LogoMark } from "../../brand/Logo";

describe("Mascot", () => {
  it.each(MASCOT_STATES)("se dibuja en el estado %s con descripción accesible", (state) => {
    const { container } = render(<Mascot state={state} />);
    expect(screen.getByRole("img", { name: /Rep, la mascota de FitMentor/ })).toBeInTheDocument();
    expect(container.querySelector(".mascot")).toHaveAttribute("data-state", state);
  });

  it("muestra el mensaje fijo y el contador en el estado count", () => {
    render(<Mascot state="count" count={7} message="Una más" />);
    expect(screen.getByRole("status")).toHaveTextContent("Una más");
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("con message=true muestra una frase del estado", () => {
    render(<Mascot state="rest" message />);
    expect(screen.getByRole("status").textContent?.length).toBeGreaterThan(5);
  });

  it("interactive cambia a animar al tocarla", () => {
    const { container } = render(<Mascot state="idle" interactive />);
    fireEvent.click(screen.getByRole("button", { name: /Tócame/ }));
    expect(container.querySelector(".mascot")).toHaveAttribute("data-state", "cheer");
  });
});

describe("LogoMark", () => {
  it("puede desactivar la animación", () => {
    const { container } = render(<LogoMark animated={false} />);
    expect(container.querySelector("svg")).not.toHaveClass("logo-mark--live");
  });
});
