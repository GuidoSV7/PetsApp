/** Client hints are inputs, not a measured GPU capability score. */
export type DeviceRenderHints = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  devicePixelRatio: number;
};

/** Lowest device tier. Its first frame is the expensive one on a cheap phone. */
export const LOW_TIER = 1.25;

/** Device tier from client hints, before the reported-DPR clamp. */
function tierForDevice({ deviceMemory, hardwareConcurrency }: DeviceRenderHints): number {
  const memoryAvailable = deviceMemory !== undefined && deviceMemory > 0 && Number.isFinite(deviceMemory);
  const lowCoreFallback = hardwareConcurrency !== undefined && hardwareConcurrency > 0 && hardwareConcurrency <= 2;
  if (memoryAvailable) {
    return deviceMemory! <= 2 ? LOW_TIER : deviceMemory! <= 4 ? 1.5 : 1.75;
  }
  return lowCoreFallback ? LOW_TIER : 1.5;
}

/** S6: the low tier starts with the cheapest possible first frame. */
export function isLowTierDevice(hints: DeviceRenderHints): boolean {
  return tierForDevice(hints) <= LOW_TIER;
}

/** DPR for the very first frame. Low-tier devices start at the floor and let the
 * adaptive monitor raise them afterwards; everyone else starts at the ceiling.
 */
export function initialDprForDevice(hints: DeviceRenderHints): number {
  return isLowTierDevice(hints) ? 1 : maxDprForDevice(hints);
}

/** Multisampling is off on the low tier; the plain lit cat and the flat field do
 * not need it, and the extra resolve cost lands on the first frame. */
export function antialiasForDevice(hints: DeviceRenderHints): boolean {
  return !isLowTierDevice(hints);
}

export function maxDprForDevice(hints: DeviceRenderHints): number {
  const tier = tierForDevice(hints);
  // Prompt2 explicitly prioritizes the floor when browser zoom reports DPR < 1.
  return Math.max(1, Math.floor(Math.min(tier, hints.devicePixelRatio) * 20) / 20);
}

export function dprForFactor(factor: number, ceiling: number): number {
  const bounded = Math.max(0, Math.min(1, factor));
  const ticks = (1 + (ceiling - 1) * bounded) * 20;
  // Absorb arithmetic ULP noise at a tick; the already-quantized cap remains absolute.
  return Math.min(ceiling, Math.max(1, Math.floor(ticks + Number.EPSILON * ticks) / 20));
}
