import { CAT_MODEL_SCALE } from "@/features/pet-home/pet-layout";

export const CAT_DESIGN_STORAGE_KEY = "petsapp.admin.cat-design";

export type CatDesignTunables = {
  modelScale: number;
  bodyDepth: number;
  headHeight: number;
  earSize: number;
};

export function defaultCatDesign(): CatDesignTunables {
  return {
    modelScale: CAT_MODEL_SCALE,
    bodyDepth: 1,
    headHeight: 0,
    earSize: 1,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function normalizeCatDesign(
  partial: Partial<CatDesignTunables>,
): CatDesignTunables {
  const defaults = defaultCatDesign();
  return {
    modelScale: clamp(
      Number.isFinite(partial.modelScale)
        ? Number(partial.modelScale)
        : defaults.modelScale,
      0.2,
      2.5,
    ),
    bodyDepth: clamp(
      Number.isFinite(partial.bodyDepth)
        ? Number(partial.bodyDepth)
        : defaults.bodyDepth,
      0.7,
      1.6,
    ),
    headHeight: clamp(
      Number.isFinite(partial.headHeight)
        ? Number(partial.headHeight)
        : defaults.headHeight,
      -0.15,
      0.25,
    ),
    earSize: clamp(
      Number.isFinite(partial.earSize)
        ? Number(partial.earSize)
        : defaults.earSize,
      0.6,
      1.6,
    ),
  };
}

export function loadCatDesign(): CatDesignTunables {
  if (typeof window === "undefined") return defaultCatDesign();
  try {
    const raw = window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY);
    if (!raw) return defaultCatDesign();
    return normalizeCatDesign(JSON.parse(raw) as Partial<CatDesignTunables>);
  } catch {
    return defaultCatDesign();
  }
}

export function saveCatDesign(next: CatDesignTunables): CatDesignTunables {
  const cleaned = normalizeCatDesign(next);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        CAT_DESIGN_STORAGE_KEY,
        JSON.stringify(cleaned),
      );
    } catch {
      /* storage unavailable */
    }
  }
  return cleaned;
}

export function clearCatDesign(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CAT_DESIGN_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}
