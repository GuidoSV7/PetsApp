import { describe, expect, it } from "vitest";
import { buildCarePlateGeometry } from "@/features/pet-home/cat-care-plate";

describe("the single-mesh care plate", () => {
  it("merges bottom, rims and food with no material groups and complete vertex colors", () => {
    const geometry = buildCarePlateGeometry();
    expect(geometry.groups).toEqual([]);
    expect(geometry.getAttribute("color").count).toBe(geometry.getAttribute("position").count);
    expect(geometry.getAttribute("position").count).toBe(6 * 24);
    expect(geometry.getAttribute("normal").count).toBe(6 * 24);
    const colors = geometry.getAttribute("color");
    const palette = new Set<string>();
    for (let i = 0; i < colors.count; i++) {
      const rgb = [colors.getX(i), colors.getY(i), colors.getZ(i)];
      expect(rgb.every(value => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
      palette.add(rgb.join(","));
    }
    expect(palette.size).toBe(3);
    expect(geometry.boundingBox!.min.y).toBeCloseTo(0, 7);
    expect(geometry.boundingBox!.max.y).toBeLessThan(.1);
    geometry.dispose();
  });
});
