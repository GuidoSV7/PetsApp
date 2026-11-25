import { describe, expect, it } from "vitest";
import { networkErrorMessage } from "@/app/_lib/petsapp-api";

describe("networkErrorMessage (Spanish admin copy)", () => {
  it("returns Spanish connection message for Failed to fetch", () => {
    const msg = networkErrorMessage("/petsapp-api", new Error("Failed to fetch"));
    expect(msg).toMatch(/No se pudo conectar con la API/i);
    expect(msg).toContain("/petsapp-api");
    expect(msg).not.toMatch(/Could not reach/i);
  });

  it("returns Spanish generic network message for other causes", () => {
    const msg = networkErrorMessage("/petsapp-api", new Error("TLS handshake failed"));
    expect(msg).toMatch(/^Error de red:/);
    expect(msg).toContain("TLS handshake failed");
    expect(msg).not.toMatch(/^Network error:/);
  });
});
