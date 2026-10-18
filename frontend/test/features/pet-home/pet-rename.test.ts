import { describe, expect, it } from "vitest";
import {
  DEFAULT_PET_NAME,
  RENAME_COST,
  petStatusText,
  renameHint,
} from "@/features/pet-home/pet-status";

describe("pet rename copy", () => {
  it("hints free then paid", () => {
    expect(renameHint(0)).toBe("Gratis");
    expect(renameHint(1)).toBe(`${RENAME_COST} monedas`);
  });

  it("builds renamed speech with the live name", () => {
    expect(petStatusText("renamed", "Luna")).toBe("¡Ahora se llama Luna!");
    expect(petStatusText("fed", DEFAULT_PET_NAME)).toMatch(/Michi/);
  });
});
