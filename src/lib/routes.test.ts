import { describe, expect, it } from "vitest";
import { parseRoute, routeHref } from "./routes";

describe("parseRoute", () => {
  it("lee la ruta del hash y cae en inicio si es desconocida", () => {
    expect(parseRoute("#/entrenar")).toBe("entrenar");
    expect(parseRoute("#/coach?tab=chat")).toBe("coach");
    expect(parseRoute("")).toBe("inicio");
    expect(parseRoute("#/no-existe")).toBe("inicio");
  });

  it("genera hrefs con hash", () => {
    expect(routeHref("perfil")).toBe("#/perfil");
  });
});
