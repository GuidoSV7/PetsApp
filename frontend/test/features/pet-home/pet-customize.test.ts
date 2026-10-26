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

  it("preserves the five palettes and adds exactly two patterned presets (S9)", () => {
    expect(COAT_PRESETS).toEqual([
      { id: "grey", label: "Gris", pattern: "solid", coat: { primary: "#8a8a8e", secondary: "#b4b4b8", accent: "#c9a0a8" } },
      { id: "white", label: "Blanco", pattern: "solid", coat: { primary: "#e8e6e1", secondary: "#f5f3ef", accent: "#c9a0a8" } },
      { id: "orange", label: "Naranja", pattern: "solid", coat: { primary: "#e8a05a", secondary: "#f0c48a", accent: "#c97b6a" } },
      { id: "calico", label: "Calicó", pattern: "calico", coat: { primary: "#c4a574", secondary: "#f0ebe3", accent: "#8b5a2b" } },
      { id: "tabby", label: "Atigrado", pattern: "tabby", coat: { primary: "#6b7280", secondary: "#9ca3af", accent: "#c9a0a8" } },
      { id: "tuxedo", label: "Esmoquin", pattern: "tuxedo", coat: { primary: "#1f1f22", secondary: "#f2f0ec", accent: "#c9a0a8" } },
      { id: "pointed", label: "Siamés", pattern: "pointed", coat: { primary: "#efe3cf", secondary: "#f7efe2", accent: "#5a4032" } },
    ]);
  });

  it("maps mood to reference captions", () => {
    expect(moodCaption("Feliz")).toMatch(/saludable/i);
    expect(moodCaption("Bien")).toBe("Bien");
    expect(moodCaption("Bajo")).toMatch(/cuidados/i);
  });
});
