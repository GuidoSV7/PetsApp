import type { CatPart } from "@/features/pet-home/cat-anatomy";
import { hexToRgb, rgbToHex } from "@/features/pet-home/extract-coat-colors";
import type { PetCoatColors } from "@/features/pet-home/extract-coat-colors";
import type { PetNeeds } from "@/features/pet-home/pet-stats";

/** Below this value a need reads as “low” on the cat. */
export const NEED_LOW_THRESHOLD = 45;

const DIRT = { r: 62, g: 48, b: 36 };

export type NeedVisualCues = {
  hungerLow: boolean;
  funLow: boolean;
  energyLow: boolean;
  hygieneLow: boolean;
  /** Multiplier on body/chest horizontal scale when hungry. */
  bodySlim: number;
  /** Extra ear pitch (radians) when bored. */
  earDroop: number;
  /** Head Y offset (negative = lower) when tired. */
  headDroop: number;
  /** Idle bob / yaw amplitude multiplier when tired. */
  idleAmp: number;
  /** Idle animation speed multiplier when tired. */
  idleSpeed: number;
  /** Pupil scale multiplier when tired / bored. */
  pupilScale: number;
  /** 0–1 coat dirt mix when hygiene is low. */
  dirtMix: number;
};

function isLow(value: number): boolean {
  return value < NEED_LOW_THRESHOLD;
}

function severity(value: number): number {
  if (value >= NEED_LOW_THRESHOLD) return 0;
  return (NEED_LOW_THRESHOLD - value) / NEED_LOW_THRESHOLD;
}

/** Pure mapping from API needs → visual knobs for the procedural cat. */
export function needVisualCues(needs: PetNeeds): NeedVisualCues {
  const hungerSev = severity(needs.hunger);
  const funSev = severity(needs.fun);
  const energySev = severity(needs.energy);
  const hygieneSev = severity(needs.hygiene);

  return {
    hungerLow: isLow(needs.hunger),
    funLow: isLow(needs.fun),
    energyLow: isLow(needs.energy),
    hygieneLow: isLow(needs.hygiene),
    bodySlim: 1 - hungerSev * 0.22,
    earDroop: funSev * 0.55,
    headDroop: -energySev * 0.08,
    idleAmp: 1 - energySev * 0.75,
    idleSpeed: 1 - energySev * 0.55,
    pupilScale: 1 - Math.max(energySev, funSev * 0.5) * 0.35,
    dirtMix: hygieneSev * 0.55,
  };
}

export function applyNeedVisualsToAnatomy(
  parts: readonly CatPart[],
  cues: NeedVisualCues,
): CatPart[] {
  return parts.map((part) => {
    if (part.id === "body" || part.id === "chest") {
      const scale = part.scale ?? ([1, 1, 1] as const);
      return {
        ...part,
        scale: [
          scale[0] * cues.bodySlim,
          scale[1],
          scale[2] * cues.bodySlim,
        ] as const,
      };
    }
    if (part.id === "head") {
      return {
        ...part,
        position: [
          part.position[0],
          part.position[1] + cues.headDroop,
          part.position[2],
        ] as const,
      };
    }
    if (
      part.id === "earL" ||
      part.id === "earR" ||
      part.id === "earInnerL" ||
      part.id === "earInnerR"
    ) {
      const base = part.rotation ?? ([0, 0, 0] as const);
      const sign = part.id.endsWith("L") ? 1 : -1;
      return {
        ...part,
        rotation: [
          base[0] + cues.earDroop,
          base[1],
          base[2] + sign * cues.earDroop * 0.25,
        ] as const,
      };
    }
    if (part.id === "pupilL" || part.id === "pupilR") {
      const scale = part.scale ?? ([1, 1, 1] as const);
      return {
        ...part,
        scale: [
          scale[0] * cues.pupilScale,
          scale[1] * cues.pupilScale,
          scale[2] * cues.pupilScale,
        ] as const,
      };
    }
    return part;
  });
}

function mixHex(hex: string, dirt: number): string {
  if (dirt <= 0) return hex;
  const c = hexToRgb(hex);
  const t = Math.min(1, Math.max(0, dirt));
  return rgbToHex(
    c.r + (DIRT.r - c.r) * t,
    c.g + (DIRT.g - c.g) * t,
    c.b + (DIRT.b - c.b) * t,
  );
}

/** Darken coat toward dirt when hygiene is low. */
export function applyNeedDirtToCoat(
  colors: PetCoatColors,
  cues: NeedVisualCues,
): PetCoatColors {
  if (cues.dirtMix <= 0) return colors;
  return {
    primary: mixHex(colors.primary, cues.dirtMix),
    secondary: mixHex(colors.secondary, cues.dirtMix * 0.85),
    accent: colors.accent,
  };
}

/** Short Spanish hint for screen readers / aria. */
export function describeNeedVisuals(cues: NeedVisualCues): string {
  const bits: string[] = [];
  if (cues.hungerLow) bits.push("tiene hambre");
  if (cues.funLow) bits.push("está aburrido");
  if (cues.energyLow) bits.push("está cansado");
  if (cues.hygieneLow) bits.push("necesita un baño");
  if (bits.length === 0) return "";
  return `Se nota que ${bits.join(", ")}.`;
}
