import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { CAT_MODEL_SCALE } from "@/features/pet-home/pet-layout";

const frontendRoot = fileURLToPath(new URL("../../", import.meta.url));
const retiredSources = [
  "app/petsapp-api/admin/pet-model/route.ts",
  "app/petsapp-api/pet/model/route.ts",
  "app/petsapp-api/pet/model/file/route.ts",
  "lib/global-pet-model-store.ts",
  "lib/assert-admin-bearer.ts",
  "features/admin/pet-model.service.ts",
  "features/admin/cat-model-asset.ts",
  "features/pet-home/components/GlbPetModel.tsx",
];
const retiredTests = [
  "lib/global-pet-model-store.test.ts",
  "lib/assert-admin-bearer.test.ts",
  "lib/hardcoded-admin.test.ts",
  "features/admin/pet-model.service.test.ts",
  "features/admin/cat-model-asset.test.ts",
];

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(filename) : [filename];
  });
}

describe("retired frontend pet-model contracts", () => {
  it("removes all eight frontend model modules and the retired admin module", () => {
    for (const filename of retiredSources) {
      expect(existsSync(path.join(frontendRoot, "src", filename)), filename).toBe(false);
    }
    expect(existsSync(path.join(frontendRoot, "src/features/auth/hardcoded-admin.ts"))).toBe(false);
  });

  it("leaves no retired module references or modelUrl contract in production source", () => {
    const retired = /global-pet-model-store|assert-admin-bearer|pet-model\.service|cat-model-asset|GlbPetModel|isHardcodedAdminBearer|\bmodelUrl\b|\buseGLTF\b/;
    for (const filename of filesUnder(path.join(frontendRoot, "src"))) {
      if (!/\.[cm]?[jt]sx?$/.test(filename)) continue;
      expect(readFileSync(filename, "utf8"), path.relative(frontendRoot, filename)).not.toMatch(retired);
    }
  });

  it("removes the frontend model directory setting from deployment documentation", () => {
    const deployment = readFileSync(path.join(frontendRoot, "..", "DEPLOY.md"), "utf8");
    const frontendEnvironment = deployment.split("## Frontend environment")[1]?.split("## ")[0];
    expect(frontendEnvironment).toBeDefined();
    expect(frontendEnvironment).not.toContain("PET_MODEL_DIR");
  });

  it("keeps the canonical procedural scale when no valid production override is supplied", () => {
    expect(CAT_MODEL_SCALE).toBe(0.78);
    expect(defaultCatDesign().modelScale).toBe(CAT_MODEL_SCALE);
  });

  it("deletes obsolete-only tests without leaving empty test modules", () => {
    for (const filename of retiredTests) {
      expect(existsSync(path.join(frontendRoot, "test", filename)), filename).toBe(false);
    }
    for (const filename of filesUnder(path.join(frontendRoot, "test"))) {
      if (!/\.(?:test|spec)\.[jt]sx?$/.test(filename)) continue;
      expect(readFileSync(filename, "utf8").trim().length, filename).toBeGreaterThan(0);
    }
  });
});
