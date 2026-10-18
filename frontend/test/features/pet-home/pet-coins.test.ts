import { describe, it, expect } from "vitest";
import { coinsLabel } from "@/features/pet-home/pet-coins";

describe("pet-coins display", () => {
  it("formats the coin pill aria label from an API balance", () => {
    expect(coinsLabel(5)).toBe("Monedas: 5");
    expect(coinsLabel(0)).toBe("Monedas: 0");
  });
});
