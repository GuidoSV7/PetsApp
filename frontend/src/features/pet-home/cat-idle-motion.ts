import type { NeedVisualCues } from "@/features/pet-home/need-visuals";

export const CAT_IDLE_PART_IDS = ["eyeL", "eyeR", "tailMid", "tailTip", "earL", "earR"] as const;
export type CatIdlePartId = (typeof CAT_IDLE_PART_IDS)[number];
export type CatIdleDelta = {
  rotation?: readonly [number, number, number];
  position?: readonly [number, number, number];
  scaleY?: number;
};
export type CatIdleMotion = Partial<Record<CatIdlePartId, CatIdleDelta>>;

/** Call-local LCG; independent streams never retain state between samples. */
function generator(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const clamp = (angle: number, cap: number) => Math.max(-cap, Math.min(cap, angle));

/** Pure mount-relative sampling. Intervals include their start, exclude their end. */
export function sampleCatIdleMotion(
  elapsedSeconds: number,
  cues: NeedVisualCues,
  { seed, reducedMotion }: { seed: number; reducedMotion: boolean },
): CatIdleMotion {
  const motion: CatIdleMotion = {};
  const blinkRandom = generator(seed);
  const openMin = cues.energyLow ? 2 : 3;
  const openRange = cues.energyLow ? 2 : 3;
  const closed = cues.energyLow ? .35 : .12;
  let blinkEnd = 0;
  while (true) {
    const start = blinkEnd + openMin + openRange * blinkRandom();
    blinkEnd = start + closed;
    if (elapsedSeconds < start) break;
    if (elapsedSeconds < blinkEnd) {
      motion.eyeL = { scaleY: .1 };
      motion.eyeR = { scaleY: .1 };
      break;
    }
  }
  if (reducedMotion) return motion;

  const phase = elapsedSeconds * 2 * cues.idleSpeed;
  const mid = clamp(Math.sin(phase) * .25 * cues.idleAmp, .35);
  const tip = clamp(Math.sin(phase - .6) * .25 * cues.idleAmp * 1.3, .46);
  motion.tailMid = { rotation: [0, 0, mid] };
  motion.tailTip = { rotation: [0, 0, tip - mid] };

  const ticRandom = generator(seed ^ 0x9e3779b9);
  const sideRandom = generator(seed ^ 0x85ebca6b);
  let onset = 0;
  while (true) {
    onset += (cues.funLow ? 10 : 5) + (cues.funLow ? 6 : 4) * ticRandom();
    const side = sideRandom() < .5 ? "earL" : "earR";
    if (elapsedSeconds < onset) break;
    if (elapsedSeconds < onset + .18) {
      motion[side] = { rotation: [.25, 0, 0] };
      break;
    }
  }
  return motion;
}
