import { describe, expect, it } from "vitest";
import {
  DEFAULT_PET_NAME,
  RENAME_COST,
  petStatusText,
  renameHint,
} from "@/features/pet-home/pet-status";

describe("pet rename copy", () => {
  it("hints free for first and repeated renames", () => {
    expect(RENAME_COST).toBe(0);
    expect(renameHint(0)).toBe("Gratis");
    expect(renameHint(1)).toBe("Gratis");
    expect(renameHint(3)).toBe("Gratis");
  });

  it("builds renamed speech with the live name", () => {
    expect(petStatusText("renamed", "Luna")).toBe("¡Ahora se llama Luna!");
    expect(petStatusText("fed", DEFAULT_PET_NAME)).toMatch(/Michi/);
  });
});
