/** Local care meters for the pet home (0–100). */

export type PetNeeds = {
  hunger: number;
  fun: number;
  energy: number;
  hygiene: number;
};

export type CareAction = "feed" | "play" | "sleep" | "bathe" | "pet";

export type MoodLabel = "Feliz" | "Bien" | "Bajo";

export const INITIAL_PET_NEEDS: PetNeeds = {
  hunger: 72,
  fun: 80,
  energy: 65,
  hygiene: 78,
};

const DELTAS: Record<CareAction, Partial<PetNeeds>> = {
  feed: { hunger: 18 },
  play: { fun: 16, energy: -4 },
  sleep: { energy: 20 },
  bathe: { hygiene: 18 },
  pet: { fun: 8 },
};

function clampNeed(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function applyCareAction(needs: PetNeeds, action: CareAction): PetNeeds {
  const delta = DELTAS[action];
  return {
    hunger: clampNeed(needs.hunger + (delta.hunger ?? 0)),
    fun: clampNeed(needs.fun + (delta.fun ?? 0)),
    energy: clampNeed(needs.energy + (delta.energy ?? 0)),
    hygiene: clampNeed(needs.hygiene + (delta.hygiene ?? 0)),
  };
}

export function needsAverage(needs: PetNeeds): number {
  return Math.round(
    (needs.hunger + needs.fun + needs.energy + needs.hygiene) / 4,
  );
}

export function moodFromNeeds(needs: PetNeeds): MoodLabel {
  const avg = needsAverage(needs);
  if (avg < 40) return "Bajo";
  if (avg < 70) return "Bien";
  return "Feliz";
}

export const NEED_LABELS = {
  hunger: "Hambre",
  fun: "Diversión",
  energy: "Energía",
  hygiene: "Higiene",
} as const;
