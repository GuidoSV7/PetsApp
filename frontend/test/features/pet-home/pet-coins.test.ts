import { describe, it, expect } from "vitest";
import { coinsLabel } from "@/features/pet-home/pet-coins";

describe("pet-coins display", () => {
  it("formats the coin pill aria label from an API balance", () => {
    expect(coinsLabel(30)).toBe("Monedas: 30");
    expect(coinsLabel(0)).toBe("Monedas: 0");
  });
});
