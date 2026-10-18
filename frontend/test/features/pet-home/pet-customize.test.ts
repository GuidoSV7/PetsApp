import { describe, it, expect } from "vitest";
import {
  COAT_PRESETS,
  moodCaption,
} from "@/features/pet-home/pet-customize";

describe("pet-customize", () => {
  it("exposes several coat presets including grey default", () => {
    expect(COAT_PRESETS.length).toBeGreaterThanOrEqual(4);
    expect(COAT_PRESETS.some((p) => p.id === "grey")).toBe(true);
  });

  it("maps mood to reference captions", () => {
    expect(moodCaption("Feliz")).toMatch(/saludable/i);
    expect(moodCaption("Bien")).toBe("Bien");
    expect(moodCaption("Bajo")).toMatch(/cuidados/i);
  });
});
