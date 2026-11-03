import { expect, it } from "vitest";
import { aoLevel, AO_FACTORS, flipDiagonal } from "@/features/pet-home/room-ao";

it("implements all side-side-corner occupancy combinations and four linear factors", () => {
  const expected = [3, 2, 2, 1, 2, 1, 0, 0];
  for (let bits = 0; bits < 8; bits++) {
    expect(aoLevel(Boolean(bits & 4), Boolean(bits & 2), Boolean(bits & 1))).toBe(expected[bits]);
  }
  expect(AO_FACTORS).toEqual([0.55, 0.70, 0.85, 1]);
});

it("flips only when the 00+11 diagonal is brighter, not on ties", () => {
  expect(flipDiagonal([3, 0, 2, 0])).toBe(true);
  expect(flipDiagonal([0, 3, 0, 2])).toBe(false);
  expect(flipDiagonal([1, 1, 1, 1])).toBe(false);
});
