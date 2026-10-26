import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { forbiddenSourceLiterals } from "../fixtures/legacy-admin-session";

const sourceRoot = fileURLToPath(new URL("../../src/", import.meta.url));
function regularFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? regularFiles(filename) : entry.isFile() ? [filename] : [];
  });
}

describe("S7 retired hardcoded admin source contracts", () => {
  it("contains no full old credential or token literal in any regular src file regardless of extension", () => {
    for (const filename of regularFiles(sourceRoot)) {
      const bytes = readFileSync(filename);
      expect.soft(forbiddenSourceLiterals.some((literal) => bytes.includes(Buffer.from(literal))), path.relative(sourceRoot, filename)).toBe(false);
    }
  });
  it("removes the retired module without an import/collection failure", () => {
    expect(existsSync(path.join(sourceRoot, "features/auth/hardcoded-admin.ts"))).toBe(false);
  });
  it("contains no imports or re-exports referencing the retired module", () => {
    for (const filename of regularFiles(sourceRoot)) {
      expect.soft(/(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s*)["'][^"']*hardcoded-admin(?:\.[cm]?[jt]s)?["']/.test(readFileSync(filename, "utf8")), path.relative(sourceRoot, filename)).toBe(false);
    }
  });
});
