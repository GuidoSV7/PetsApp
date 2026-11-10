import { describe, expect, it } from "vitest";
import {
  antialiasForDevice,
  dprForFactor,
  initialDprForDevice,
  isLowTierDevice,
  maxDprForDevice,
} from "@/features/pet-home/pet-render-quality";

describe("ceiling policy", () => {
  it.each([
    [0.5, 8, 3, 1.25], [1, 8, 3, 1.25], [2, 8, 3, 1.25],
    [2.01, 2, 3, 1.5], [4, undefined, 3, 1.5], [8, 2, 3, 1.75], [8, undefined, 3, 1.75],
    [undefined, 1, 3, 1.25], [undefined, 2, 3, 1.25], [undefined, undefined, 3, 1.5], [undefined, 8, 3, 1.5],
    [8, 8, 1, 1], [8, 8, 1.37, 1.35], [4, 8, 1.49, 1.45], [8, 8, 1.74, 1.7],
    [2, 8, 1.23, 1.2], [8, 8, 0.8, 1], [undefined, 2, 0.8, 1], [8, 8, 1.15, 1.15],
    [2, 2, 1.25, 1.25], [4, 2, 1.5, 1.5], [8, 2, 1.75, 1.75],
  ])("maps memory=%s cores=%s dpr=%s to %s", (deviceMemory, hardwareConcurrency, devicePixelRatio, expected) => {
    expect(maxDprForDevice({ deviceMemory, hardwareConcurrency, devicePixelRatio: devicePixelRatio! })).toBe(expected);
  });
});

describe("first frame policy (S6: cheap first frame on low-end phones)", () => {
  it.each([
    [2, 8], [0.5, 8], [1, 4], [2, 2], [undefined, 1], [undefined, 2],
  ])("treats memory=%s cores=%s as the low tier", (deviceMemory, hardwareConcurrency) => {
    const hints = { deviceMemory, hardwareConcurrency, devicePixelRatio: 3 };
    expect(isLowTierDevice(hints)).toBe(true);
    // First frame renders at the floor; the adaptive monitor may raise it later.
    expect(initialDprForDevice(hints)).toBe(1);
    expect(antialiasForDevice(hints)).toBe(false);
  });

  it.each([
    [2.01, 8], [4, 8], [8, 8], [8, 2], [undefined, 4], [undefined, 8], [undefined, undefined],
  ])("keeps the full ceiling and MSAA for memory=%s cores=%s", (deviceMemory, hardwareConcurrency) => {
    const hints = { deviceMemory, hardwareConcurrency, devicePixelRatio: 3 };
    expect(isLowTierDevice(hints)).toBe(false);
    // Still bounded by the reported DPR, exactly like the ceiling policy.
    expect(initialDprForDevice(hints)).toBe(maxDprForDevice(hints));
    expect(antialiasForDevice(hints)).toBe(true);
  });

  it("never starts above the reported device pixel ratio", () => {
    expect(initialDprForDevice({ deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 1 })).toBe(1);
    expect(initialDprForDevice({ deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 1.37 })).toBe(1.35);
    expect(initialDprForDevice({ deviceMemory: 8, hardwareConcurrency: 8, devicePixelRatio: 0.8 })).toBe(1);
  });
});

describe("factor policy", () => {
  it.each([
    [-1, 1.75, 1], [0, 1.75, 1], [0.2, 1.75, 1.15], [0.4, 1.75, 1.3],
    [0.5, 1.75, 1.35], [0.55, 1.75, 1.4], [0.7, 1.75, 1.5], [0.85, 1.75, 1.6],
    [1, 1.75, 1.75], [2, 1.75, 1.75], [0, 1, 1], [0.5, 1, 1], [1, 1, 1],
    [0.5, 1.5, 1.25], [0.5, 1.25, 1.1], [0.49, 1.75, 1.35],
  ])("maps factor=%s ceiling=%s to %s", (factor, ceiling, expected) => {
    expect(dprForFactor(factor, ceiling)).toBe(expected);
  });
  it("does not lose exact ticks when repeated monitor steps accumulate floating-point noise", () => {
    const outputs: number[] = [];
    for (let factor = 1; factor > 0; factor -= 0.15) outputs.push(dprForFactor(factor, 1.75));
    expect(outputs).toEqual([1.75, 1.6, 1.5, 1.4, 1.3, 1.15, 1.05]);
  });
});
