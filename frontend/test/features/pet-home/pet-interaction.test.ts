import { describe, it, expect } from "vitest";
import {
  PET_INTERACT_HINT,
  petInteractStatusKey,
} from "@/features/pet-home/pet-interaction";

describe("pet interaction copy", () => {
  it("hint mentions rotating and purring", () => {
    const lower = PET_INTERACT_HINT.toLowerCase();
    expect(lower).toMatch(/girar|arrastr/);
    expect(lower).toMatch(/mimar|toc|ronrone/);
  });

  it("maps interact to petted status key", () => {
    expect(petInteractStatusKey()).toBe("petted");
  });
});
