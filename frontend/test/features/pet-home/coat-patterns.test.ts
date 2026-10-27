import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAT_ANATOMY, CAT_MATERIAL_ROLES } from "@/features/pet-home/cat-anatomy";
import { COAT_PATTERNS, deriveTabbyStripeColor, getCoatPatternBoxes, normalizeCoatPattern, type CoatPattern } from "@/features/pet-home/coat-patterns";
import { applyNeedDirtToCoat, needVisualCues } from "@/features/pet-home/need-visuals";

const patterns = ["solid", "tabby", "tuxedo", "calico", "pointed"] as const;
const counts = [0, 12, 8, 4, 12];
const head = CAT_ANATOMY.find(p => p.id === "head")!;
const eyes = CAT_ANATOMY.filter(p => p.role === "eye");
const eyeTop = Math.max(...eyes.map(p => p.position[1] - head.position[1] + p.args[1] / 2));
const eyeOuterX = Math.max(...eyes.map(p => Math.abs(p.position[0] - head.position[0]) + p.args[0] / 2));

describe("coat pattern contract", () => {
  it("uses the exact append-only backend identifiers and order", () => {
    expect(COAT_PATTERNS).toEqual(patterns);
    const backend = readFileSync(new URL("../../../../backend/src/pet/pet-rules.ts", import.meta.url), "utf8");
    const tuple = backend.match(/COAT_PATTERNS\s*=\s*\[([^\]]+)\]/)![1];
    expect([...tuple.matchAll(/["']([^"']+)["']/g)].map(m => m[1])).toEqual(patterns);
  });
  it.each(patterns)("retains known identifier %s", pattern => {
    expect(normalizeCoatPattern(pattern)).toBe(pattern);
  });
  it.each([undefined, null, "zebra"])("falls back to solid for a missing/unknown read value %s", value => {
    expect(normalizeCoatPattern(value)).toBe("solid");
  });
  it.each(patterns)("expands the approved %s table without mutating anatomy or roles", pattern => {
    const before = JSON.stringify({ CAT_ANATOMY, CAT_MATERIAL_ROLES });
    const boxes = getCoatPatternBoxes(pattern);
    expect(boxes).toHaveLength(counts[patterns.indexOf(pattern)]);
    expect(getCoatPatternBoxes(pattern)).toEqual(boxes);
    const baseIds = new Set(CAT_ANATOMY.map(p => p.id));
    expect(new Set(boxes.map(p => p.id)).size).toBe(boxes.length);
    for (const box of boxes) {
      expect(box.id).toMatch(new RegExp(`^${pattern}-${box.anchorId}-\\d+$`));
      expect(baseIds.has(box.id)).toBe(false);
      expect(baseIds.has(box.anchorId)).toBe(true);
      expect(box.face).toBe("+Z");
    }
    expect(JSON.stringify({ CAT_ANATOMY, CAT_MATERIAL_ROLES })).toBe(before);
  });
  it("matches every approved table center, size, ink, angle and per-anchor ID", () => {
    const design = readFileSync(new URL("../../../openspec/changes/pet-voxel-coat-patterns/design.md", import.meta.url), "utf8");
    const table = design.split("## Revised frontal table")[1].split("Totals:")[0];
    const expected: Record<string, unknown[]> = Object.fromEntries(patterns.map(p => [p, []]));
    const counters = new Map<string, number>();
    for (const line of table.split("\n")) {
      const cells = line.split("|").map(s => s.trim());
      if (!patterns.includes(cells[1] as CoatPattern) || cells[1] === "solid") continue;
      const pattern = cells[1];
      const [anchorText] = cells[2].split("/");
      const centers = [...cells[3].matchAll(/\((-?[\d.]+),\s*(-?[\d.]+)\)/g)].map(m => [+m[1], +m[2]]);
      const size = cells[4].split("×").map(Number);
      const angles = cells[5].includes("rad") ? [...cells[5].matchAll(/[+-]?[\d.]+/g)].map(m => +m[0]) : [0];
      const ink = cells[5].match(/stripe|secondary|accent/)![0];
      for (const anchorId of anchorText.trim().split(",")) centers.forEach((center, index) => {
        const key = `${pattern}-${anchorId}`, number = counters.get(key) ?? 0;
        counters.set(key, number + 1);
        expected[pattern].push({ id: `${key}-${number}`, anchorId, center, size, ink, rotation: [0, 0, angles[index % angles.length]] });
      });
    }
    for (const pattern of patterns) {
      const boxes = getCoatPatternBoxes(pattern).map(({ id, anchorId, center, size, ink, rotation }) => ({ id, anchorId, center, size, ink, rotation }));
      const byId = (a: unknown, b: unknown) => (a as { id: string }).id.localeCompare((b as { id: string }).id);
      expect(boxes.sort(byId)).toEqual(expected[pattern].sort(byId));
    }
  });
  it("thickens all four M strokes while staying above the eyes", () => {
    const strokes = getCoatPatternBoxes("tabby").filter(p => p.anchorId === "head").slice(0, 4);
    expect(strokes).toHaveLength(4);
    for (const p of strokes) {
      expect(p.size[0]).toBeGreaterThanOrEqual(.032);
      const lower = p.center[1] - (Math.abs(Math.sin(p.rotation[2])) * p.size[0] + Math.abs(Math.cos(p.rotation[2])) * p.size[1]) / 2;
      expect(lower).toBeGreaterThan(eyeTop);
    }
  });
  it("replaces the two thin facial bars with four wider horizontal bands outside the eyes", () => {
    const bands = getCoatPatternBoxes("tabby").filter(p => p.anchorId === "head").slice(4);
    expect(bands).toHaveLength(4);
    for (const p of bands) {
      expect(p.size).toEqual([.07, .04]);
      expect(Math.abs(p.center[0]) - p.size[0] / 2).toBeGreaterThan(eyeOuterX);
    }
  });
  it("puts two horizontal bands on each front leg instead of hidden body bars", () => {
    const patches = getCoatPatternBoxes("tabby");
    for (const anchor of ["legFL", "legFR"]) {
      const bands = patches.filter(p => p.anchorId === anchor);
      expect(bands).toHaveLength(2);
      for (const p of bands) expect(p.size).toEqual([.10, .04]);
    }
    expect(patches.some(p => p.anchorId === "body")).toBe(false);
  });
  it("uses four chunky asymmetric calico boxes as three logical spots, never body/face side bars", () => {
    const patches = getCoatPatternBoxes("calico");
    expect(patches).toHaveLength(4);
    for (const p of patches) {
      expect(["head", "legFR"]).toContain(p.anchorId);
      expect(Math.min(...p.size)).toBeGreaterThanOrEqual(.10);
      expect(Math.max(...p.size) / Math.min(...p.size)).toBeLessThanOrEqual(2);
    }
    const brown = patches.filter(p => p.ink === "accent");
    expect(brown.map(p => p.anchorId)).toEqual(["head", "legFR"]);
    expect(brown[0].center[0]).toBeLessThan(-.1);
    const [center, right] = patches.filter(p => p.ink === "secondary").sort((a, b) => a.center[0] - b.center[0]);
    expect(right.center[0] - right.size[0] / 2 - center.center[0] - center.size[0] / 2).toBeCloseTo(.003, 12);
    expect(center.center[1] + center.size[1] / 2).toBeCloseTo(right.center[1] + right.size[1] / 2, 12);
  });
  it("keeps the stricter twelve-box ceiling and approved tuxedo/pointed counts (preservation)", () => {
    for (const pattern of patterns) expect(getCoatPatternBoxes(pattern).length).toBeLessThanOrEqual(12);
    expect(getCoatPatternBoxes("tuxedo")).toHaveLength(8);
    expect(getCoatPatternBoxes("pointed")).toHaveLength(12);
  });
  it("derives clean stripes 50% toward black rather than from pink accent", () => {
    expect(deriveTabbyStripeColor("#6b7280")).toBe("#363940");
  });
  it("derives after existing dirt exactly once and preserves accent (existing dirt control)", () => {
    const colors = { primary: "#6b7280", secondary: "#9ca3af", accent: "#c9a0a8" };
    const dirty = applyNeedDirtToCoat(colors, needVisualCues({ hunger: 100, fun: 100, energy: 100, hygiene: 0 }));
    expect(dirty.primary).not.toBe(colors.primary);
    expect(dirty.secondary).not.toBe(colors.secondary);
    expect(dirty.accent).toBe(colors.accent);
    const channels = [1, 3, 5].map(i => Math.round(parseInt(dirty.primary.slice(i, i + 2), 16) * .50).toString(16).padStart(2, "0"));
    expect(deriveTabbyStripeColor(dirty.primary)).toBe(`#${channels.join("")}`);
    expect(deriveTabbyStripeColor(dirty.primary)).not.toBe(deriveTabbyStripeColor(colors.primary));
  });
});
