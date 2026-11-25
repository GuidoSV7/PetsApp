/**
 * T1 — S1 (contrast tokens, minimum text size) and S8 (tokens instead of
 * hard-coded colors) and S7 (touch target ≥ 24×24 CSS px) contract checks.
 *
 * These are structural checks over the stylesheet modules: the stylesheets are
 * the public surface the audit spec fixes, and jsdom cannot compute CSSOM for
 * CSS modules.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const frontendDir = join(__dirname, "..", "..", "src");

const read = (...parts: string[]) =>
  readFileSync(join(frontendDir, ...parts), "utf8");

const globals = read("app", "globals.css");
const home = read("app", "home.module.css");
const petHome = read("features", "pet-home", "components", "pet-home.module.css");
const authModal = read("features", "auth", "components", "auth-modal.module.css");
const login = read("app", "login", "login.module.css");

describe("S1 design tokens", () => {
  it("declares a text-safe primary and a single error token in globals.css", () => {
    expect(globals).toContain("--primario-texto:");
    expect(globals).toContain("--estado-error:");
  });

  it.each([
    ["home.module.css", home],
    ["pet-home.module.css", petHome],
    ["auth-modal.module.css", authModal],
    ["login.module.css", login],
  ])("%s uses the error token instead of hard-coded error colors", (_name, css) => {
    expect(css).not.toMatch(/#c0392b|#8b241c|#d63b6a|#f500dc/i);
  });

  it.each([
    ["home.module.css", home],
    ["pet-home.module.css", petHome],
    ["login.module.css", login],
  ])("%s renders text-primary green through the token, not raw #1f8f4e", (_name, css) => {
    expect(css).not.toMatch(/color:\s*#1f8f4e/i);
  });
});

describe("S1 minimum text size", () => {
  const FONTS: Array<[string, string]> = [
    ["home.module.css", home],
    ["pet-home.module.css", petHome],
    ["auth-modal.module.css", authModal],
    ["login.module.css", login],
  ];

  it("never sets a font-size under 12px (0.75rem)", () => {
    const offenders: string[] = [];
    for (const [name, css] of FONTS) {
      const matches = css.matchAll(/font-size:\s*([\d.]+)rem/g);
      for (const [, value] of matches) {
        if (Number.parseFloat(value) < 0.75) offenders.push(`${name}: ${value}rem`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps care-button labels, need labels and rename hint at least 0.8rem", () => {
    for (const className of [
      "careButton",
      "needLabel",
      "needValue",
      "renameHint",
    ]) {
      const block = petHome.split(`.${className} {`)[1] ?? petHome.split(`.${className} {`)[0] ?? "";
      const scope = petHome.slice(petHome.indexOf(`.${className} {`));
      const value = scope.match(/font-size:\s*([\d.]+)rem/)?.[1];
      expect(value, className).toBeDefined();
      expect(Number.parseFloat(value!), `${className}`).toBeGreaterThanOrEqual(0.8);
      void block;
    }
  });
});

describe("S8 tokens replace hard-coded colors", () => {
  it("home.module.css and pet-home.module.css no longer carry the old text hex palette", () => {
    for (const css of [home, petHome]) {
      const offenders = [...css.matchAll(/color:\s*#(?:143022|1c2b22|3a5246|5a7a66|1f8f4e)\b/g)];
      expect(offenders.map((m) => m[0])).toEqual([]);
    }
  });

  it("removes the dead neon-landing CSS from home.module.css", () => {
    for (const dead of [
      ".hero {",
      ".heroTexto",
      ".heroTitulo",
      ".tituloNeonCyan",
      ".heroSubtexto",
      ".botonesHero",
      ".botonPrimario",
      ".footer",
      ".footerColumnas",
      ".footerCol",
      ".footerLista",
      ".footerEnlace",
      ".footerCopy",
    ]) {
      expect(home).not.toContain(dead);
    }
  });
});

describe("S7 minimum touch target", () => {
  it("sizes .coinAdd at least 24×24 CSS px", () => {
    const scope = petHome.slice(petHome.indexOf(".coinAdd {"));
    const width = scope.match(/width:\s*([\d.]+)px/)?.[1];
    const height = scope.match(/height:\s*([\d.]+)px/)?.[1];
    expect(Number(width)).toBeGreaterThanOrEqual(24);
    expect(Number(height)).toBeGreaterThanOrEqual(24);
  });

  it("gives the pet-name edit button a comfortable target (≥ 24px height)", () => {
    const scope = petHome.slice(petHome.indexOf(".petNameButton {"));
    const minHeight = scope.match(/min-height:\s*([\d.]+)px/)?.[1];
    expect(Number(minHeight)).toBeGreaterThanOrEqual(24);
  });
});
