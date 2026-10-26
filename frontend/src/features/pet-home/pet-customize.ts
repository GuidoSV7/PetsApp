import type { CoatPattern } from "@/features/pet-home/coat-patterns";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

export type CoatPreset = {
  id: string;
  label: string;
  pattern: CoatPattern;
  coat: PetCoatColors;
};

/** Curated coat swatches for the Personalizar strip. */
export const COAT_PRESETS: readonly CoatPreset[] = [
  { id: "grey", label: "Gris", pattern: "solid", coat: DEFAULT_GREY_COAT },
  {
    id: "white",
    label: "Blanco",
    pattern: "solid",
    coat: { primary: "#e8e6e1", secondary: "#f5f3ef", accent: "#c9a0a8" },
  },
  {
    id: "orange",
    label: "Naranja",
    pattern: "solid",
    coat: { primary: "#e8a05a", secondary: "#f0c48a", accent: "#c97b6a" },
  },
  {
    id: "calico",
    label: "Calicó",
    pattern: "calico",
    coat: { primary: "#c4a574", secondary: "#f0ebe3", accent: "#8b5a2b" },
  },
  {
    id: "tabby",
    label: "Atigrado",
    pattern: "tabby",
    coat: { primary: "#6b7280", secondary: "#9ca3af", accent: "#c9a0a8" },
  },
  {
    id: "tuxedo",
    label: "Esmoquin",
    pattern: "tuxedo",
    coat: { primary: "#1f1f22", secondary: "#f2f0ec", accent: "#c9a0a8" },
  },
  {
    id: "pointed",
    label: "Siamés",
    pattern: "pointed",
    coat: { primary: "#efe3cf", secondary: "#f7efe2", accent: "#5a4032" },
  },
] as const;

export function moodCaption(mood: string): string {
  if (mood === "Feliz") return "Feliz y saludable";
  if (mood === "Bien") return "Bien";
  if (mood === "Bajo") return "Necesita cuidados";
  return mood;
}

export function isCoatPresetId(id: string): boolean {
  return COAT_PRESETS.some((preset) => preset.id === id);
}
