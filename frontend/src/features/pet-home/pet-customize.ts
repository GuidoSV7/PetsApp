import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import type { MoodLabel } from "@/features/pet-home/pet-stats";

export type CoatPreset = {
  id: string;
  label: string;
  coat: PetCoatColors;
};

/** Curated coat swatches for the Personalizar strip. */
export const COAT_PRESETS: readonly CoatPreset[] = [
  { id: "grey", label: "Gris", coat: DEFAULT_GREY_COAT },
  {
    id: "white",
    label: "Blanco",
    coat: { primary: "#e8e6e1", secondary: "#f5f3ef", accent: "#c9a0a8" },
  },
  {
    id: "orange",
    label: "Naranja",
    coat: { primary: "#e8a05a", secondary: "#f0c48a", accent: "#c97b6a" },
  },
  {
    id: "calico",
    label: "Calicó",
    coat: { primary: "#c4a574", secondary: "#f0ebe3", accent: "#8b5a2b" },
  },
  {
    id: "tabby",
    label: "Atigrado",
    coat: { primary: "#6b7280", secondary: "#9ca3af", accent: "#c9a0a8" },
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

export type { MoodLabel };
