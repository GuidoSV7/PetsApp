import { describe, it, expect } from "vitest";
import {
  INITIAL_PET_NEEDS,
  applyCareAction,
  moodFromNeeds,
  needsAverage,
} from "@/features/pet-home/pet-stats";

describe("pet-stats", () => {
  it("exposes initial needs in the mid-high range", () => {
    expect(INITIAL_PET_NEEDS.hunger).toBe(72);
    expect(INITIAL_PET_NEEDS.fun).toBe(80);
    expect(INITIAL_PET_NEEDS.energy).toBe(65);
    expect(INITIAL_PET_NEEDS.hygiene).toBe(78);
  });

  it("feed raises hunger and clamps at 100", () => {
    const next = applyCareAction(INITIAL_PET_NEEDS, "feed");
    expect(next.hunger).toBe(
      Math.min(100, INITIAL_PET_NEEDS.hunger + 18),
    );
  });

  it("play raises fun and slightly lowers energy", () => {
    const next = applyCareAction(INITIAL_PET_NEEDS, "play");
    expect(next.fun).toBeGreaterThan(INITIAL_PET_NEEDS.fun);
    expect(next.energy).toBeLessThan(INITIAL_PET_NEEDS.energy);
  });

  it("sleep raises energy", () => {
    expect(applyCareAction(INITIAL_PET_NEEDS, "sleep").energy).toBe(
      Math.min(100, INITIAL_PET_NEEDS.energy + 20),
    );
  });

  it("bathe raises hygiene", () => {
    expect(applyCareAction(INITIAL_PET_NEEDS, "bathe").hygiene).toBe(
      Math.min(100, INITIAL_PET_NEEDS.hygiene + 18),
    );
  });

  it("pet raises fun", () => {
    expect(applyCareAction(INITIAL_PET_NEEDS, "pet").fun).toBe(
      Math.min(100, INITIAL_PET_NEEDS.fun + 8),
    );
  });

  it("mood tracks average bands", () => {
    expect(moodFromNeeds({ hunger: 90, fun: 90, energy: 90, hygiene: 90 })).toBe(
      "Feliz",
    );
    expect(moodFromNeeds({ hunger: 50, fun: 50, energy: 50, hygiene: 50 })).toBe(
      "Bien",
    );
    expect(moodFromNeeds({ hunger: 20, fun: 20, energy: 20, hygiene: 20 })).toBe(
      "Bajo",
    );
    expect(needsAverage({ hunger: 100, fun: 100, energy: 100, hygiene: 100 })).toBe(
      100,
    );
  });
});
