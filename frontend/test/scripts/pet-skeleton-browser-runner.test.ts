import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("rejects baseline regeneration without changing any historical evidence or fixture", () => {
  const evidence = "openspec/changes/pet-voxel-skeleton/evidence";
  const files = [...readdirSync(evidence).map(name => path.join(evidence, name)), "test/fixtures/pet-skeleton/legacy-world.json.gz"];
  const seal = () => files.map(file => [file, createHash("sha256").update(readFileSync(file)).digest("hex")]);
  const before = seal();
  const result = spawnSync(process.execPath, ["scripts/browser-evidence/pet-voxel-skeleton.cjs"], {
    encoding: "utf8", env: { ...process.env, PET_SKELETON_PHASE: "baseline" },
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(2);
  expect(result.stdout).toBe("");
  expect(result.stderr).toBe("A1 baseline is frozen; only PET_SKELETON_PHASE=after is supported.\n");
  expect(seal()).toEqual(before);
});
