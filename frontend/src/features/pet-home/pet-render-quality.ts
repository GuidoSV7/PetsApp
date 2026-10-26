/** Client hints are inputs, not a measured GPU capability score. */
export type DeviceRenderHints = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  devicePixelRatio: number;
};

export function maxDprForDevice({
  deviceMemory,
  hardwareConcurrency,
  devicePixelRatio,
}: DeviceRenderHints): number {
  const memoryAvailable = deviceMemory !== undefined && deviceMemory > 0 && Number.isFinite(deviceMemory);
  const lowCoreFallback = hardwareConcurrency !== undefined && hardwareConcurrency > 0 && hardwareConcurrency <= 2;
  const tier = memoryAvailable
    ? deviceMemory <= 2 ? 1.25 : deviceMemory <= 4 ? 1.5 : 1.75
    : lowCoreFallback ? 1.25 : 1.5;
  // Prompt2 explicitly prioritizes the floor when browser zoom reports DPR < 1.
  return Math.max(1, Math.floor(Math.min(tier, devicePixelRatio) * 20) / 20);
}

export function dprForFactor(factor: number, ceiling: number): number {
  const bounded = Math.max(0, Math.min(1, factor));
  const ticks = (1 + (ceiling - 1) * bounded) * 20;
  // Absorb arithmetic ULP noise at a tick; the already-quantized cap remains absolute.
  return Math.min(ceiling, Math.max(1, Math.floor(ticks + Number.EPSILON * ticks) / 20));
}
