import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Logo, LogoMark } from "./Logo";

describe("Logo", () => {
  it("la marca sola expone el nombre accesible", () => {
    render(<LogoMark animated={false} />);
    expect(screen.getByRole("img", { name: "FitMentor" })).toBeInTheDocument();
  });

  it("con wordmark muestra FitMentor una sola vez para lectores de pantalla", () => {
    render(<Logo animated={false} />);
    expect(screen.getAllByLabelText("FitMentor")).toHaveLength(1);
    expect(screen.getByText("Fit")).toBeInTheDocument();
    expect(screen.getByText("Mentor")).toBeInTheDocument();
  });

  it("markOnly oculta el texto", () => {
    render(<Logo markOnly animated={false} />);
    expect(screen.queryByText("Mentor")).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "FitMentor" })).toBeInTheDocument();
  });
});
