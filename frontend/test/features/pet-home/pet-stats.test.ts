import { describe, it, expect } from "vitest";
import { EMPTY_PET_NEEDS, NEED_LABELS } from "@/features/pet-home/pet-stats";

describe("pet-stats display", () => {
  it("exposes Spanish need labels for the meters", () => {
    expect(NEED_LABELS.hunger).toBe("Hambre");
    expect(NEED_LABELS.fun).toBe("Diversión");
    expect(NEED_LABELS.energy).toBe("Energía");
    expect(NEED_LABELS.hygiene).toBe("Higiene");
  });

  it("starts empty until the pet API hydrates", () => {
    expect(EMPTY_PET_NEEDS).toEqual({
      hunger: 0,
      fun: 0,
      energy: 0,
      hygiene: 0,
    });
  });
});
