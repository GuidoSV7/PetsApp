/**
 * @vitest-environment node
 *
 * T3 / S10 — skip link, light color-scheme, and Pollar gate brand contracts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const srcRoot = join(__dirname, "..", "..", "src");

describe("shell a11y contracts (#52, #59)", () => {
  it("exposes skip link “Ir al contenido” targeting #inicio", () => {
    const layout = readFileSync(join(srcRoot, "app", "layout.tsx"), "utf8");
    expect(layout).toMatch(/Ir al contenido/);
    expect(layout).toMatch(/href=["']#inicio["']/);
    expect(layout).toMatch(/className=["']skipLink["']/);
  });

  it("forces light color-scheme until a full AA dark palette exists", () => {
    const layout = readFileSync(join(srcRoot, "app", "layout.tsx"), "utf8");
    const globals = readFileSync(join(srcRoot, "app", "globals.css"), "utf8");

    expect(layout).toMatch(/colorScheme:\s*["']light["']/);
    expect(globals).toMatch(/color-scheme:\s*light/);
    expect(globals).not.toMatch(
      /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{[^}]*color-scheme:\s*dark/,
    );
  });

  it("defines a unified :focus-visible ring for interactive controls", () => {
    const globals = readFileSync(join(srcRoot, "app", "globals.css"), "utf8");
    expect(globals).toContain("--anillo-foco");
    expect(globals).toMatch(/:focus-visible/);
    expect(globals).toContain(".skipLink");
  });
});
