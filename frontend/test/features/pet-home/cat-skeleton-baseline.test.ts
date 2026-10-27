import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

export type FrozenBox = { id: string; parent: string; visible: boolean; matrix: number[]; position: number[]; scale: number[] };
export type FrozenState = { boxes: FrozenBox[]; root: { position: number[]; rotation: number[]; scale: number[] }; camera: unknown; passes: { calls: number }[] };
export type FrozenCase = { id: string; pattern: string; n: number; need: number; design: null | { modelScale: number; bodyDepth: number; headHeight: number; earSize: number }; rest: FrozenState; idle: { time: number; state: FrozenState }[] };
export const frozenWorld = JSON.parse(gunzipSync(readFileSync(new URL("../../fixtures/pet-skeleton/legacy-world.json.gz", import.meta.url))).toString()) as { phase: string; base: string; cases: FrozenCase[] };

describe("independent pre-skeleton actual-browser oracle (T0 preservation control)", () => {
  it("is the frozen pre-production fixture, not a regenerated solver expectation", () => {
    const manifest = JSON.parse(readFileSync(new URL("../../../openspec/changes/pet-voxel-skeleton/evidence/baseline-manifest.json", import.meta.url), "utf8"));
    const bytes = readFileSync(new URL("../../fixtures/pet-skeleton/legacy-world.json.gz", import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.fixtureSha256);
    expect(frozenWorld.phase).toBe("baseline");
    expect(frozenWorld.base).toBe(manifest.base);
    expect(manifest.frozenBeforeProductionChanges).toBe(true);
    expect(frozenWorld.cases).toHaveLength(12);
  });
  for (const fixture of frozenWorld.cases) it(`${fixture.id}: complete matrices and measured cost`, () => {
    expect(fixture.rest.boxes).toHaveLength(33 + fixture.n);
    expect(fixture.rest.passes).toHaveLength(6);
    expect(fixture.rest.passes.reduce((sum, pass) => sum + pass.calls, 0)).toBe(2 * (33 + fixture.n) + 5);
    expect(fixture.idle).toHaveLength(6);
    for (const state of [fixture.rest, ...fixture.idle.map(s => s.state)]) {
      expect(new Set(state.boxes.map(b => b.id)).size).toBe(33 + fixture.n);
      for (const box of state.boxes) {
        expect(box.visible).toBe(true);
        expect(box.matrix).toHaveLength(16);
        expect(box.matrix.every(Number.isFinite)).toBe(true);
      }
    }
  });
});
