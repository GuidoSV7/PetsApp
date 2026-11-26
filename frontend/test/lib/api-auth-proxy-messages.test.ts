import { describe, expect, it } from "vitest";
import { mapApiResponseError, mapProxyErrorMessage } from "@/lib/api-auth-policy";

describe("proxy error messages (#79 / S11)", () => {
  it.each([
    ["Invalid path", /ruta no válida|inválida/i],
    ["Upstream unavailable", /no está disponible|no disponible/i],
  ])("maps English proxy code %s to Spanish", (english, pattern) => {
    expect(mapProxyErrorMessage(english)).toMatch(pattern);
    expect(mapProxyErrorMessage(english)).not.toBe(english);
  });

  it("leaves unknown messages unchanged", () => {
    expect(mapProxyErrorMessage("Email already registered")).toBe(
      "Email already registered",
    );
  });

  it("mapApiResponseError surfaces Spanish for proxy English bodies", () => {
    const err = mapApiResponseError({
      response: { status: 502, data: { message: "Upstream unavailable" } },
      message: "Request failed",
    });
    expect(err.message).toMatch(/no está disponible|no disponible/i);
    expect(err.message).not.toMatch(/Upstream unavailable/);
  });

  it("mapApiResponseError keeps already-Spanish proxy bodies", () => {
    const spanish = "El servicio no está disponible. Probá de nuevo en un rato.";
    const err = mapApiResponseError({
      response: { status: 502, data: { message: spanish } },
      message: "Request failed",
    });
    expect(err.message).toBe(spanish);
  });
});
