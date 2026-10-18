/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { CAT_ANATOMY, getCatPart } from "@/features/pet-home/cat-anatomy";
import {
  CAT_DESIGN_STORAGE_KEY,
  clearCatDesign,
  defaultCatDesign,
  loadCatDesign,
  normalizeCatDesign,
  saveCatDesign,
} from "@/features/admin/cat-design-settings";
import {
  resolveCatAnatomy,
  resolveModelScale,
} from "@/features/admin/resolve-cat-design";

describe("cat design settings", () => {
  afterEach(() => {
    clearCatDesign();
  });

  it("normalizes and persists tunables", () => {
    const saved = saveCatDesign(
      normalizeCatDesign({
        modelScale: 0.9,
        bodyDepth: 1.2,
        headHeight: 0.05,
        earSize: 1.1,
      }),
    );
    expect(loadCatDesign()).toEqual(saved);
    expect(window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY)).toBeTruthy();
  });

  it("resolves anatomy overrides while keeping required parts", () => {
    const tunables = normalizeCatDesign({
      bodyDepth: 1.25,
      headHeight: 0.1,
      earSize: 1.3,
      modelScale: 0.85,
    });
    const resolved = resolveCatAnatomy(CAT_ANATOMY, tunables);
    const ids = resolved.map((p) => p.id);
    expect(ids).toContain("body");
    expect(ids).toContain("head");
    expect(ids).toContain("earL");
    expect(ids).toContain("earR");

    const baseBody = getCatPart("body")!;
    const body = resolved.find((p) => p.id === "body")!;
    expect(body.scale![2]).toBeCloseTo(
      (baseBody.scale?.[2] ?? 1) * tunables.bodyDepth,
    );

    const baseHead = getCatPart("head")!;
    const head = resolved.find((p) => p.id === "head")!;
    expect(head.position[1]).toBeCloseTo(
      baseHead.position[1] + tunables.headHeight,
    );

    expect(resolveModelScale(tunables)).toBe(0.85);
    expect(defaultCatDesign().bodyDepth).toBe(1);
  });
});
