import { describe, expect, it } from "vitest";
import { PET_ROOM_BG } from "@/features/pet-home/pet-layout";

describe("home room glass theme", () => {
  it("points at the shipped room background asset", () => {
    expect(PET_ROOM_BG).toBe("/imagenes/pet-room-bg.png");
  });
});
