/** @vitest-environment jsdom */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FieldBackdrop, FieldPlaceholder } from "@/features/pet-home/components/FieldBackdrop";
import styles from "@/features/pet-home/components/pet-home.module.css";
import { DEFAULT_PET_NAME } from "@/features/pet-home/pet-status";
import {
  fieldBackdropGeometry,
  latticePathData,
  platePointsAttribute,
} from "@/features/pet-home/field-backdrop";
import {
  dioramaCameraPose,
  FIELD_VIEW,
  homeCameraView,
} from "@/features/pet-home/field-view";
import { FIELD_PALETTE } from "@/features/pet-home/field-geometry";
import { FIELD_SIZE } from "@/features/pet-home/room-grid";
import { CAT_MODEL_SCALE, catGroundY } from "@/features/pet-home/pet-layout";

afterEach(cleanup);

const plate = (container: HTMLElement) => container.querySelector("polygon")!;
const lattice = (container: HTMLElement) => container.querySelector("path")!;
// jsdom rewrites `import.meta.url` to an http URL, so the stylesheet is resolved
// from the project root instead of from the test file.
const css = ["", "frontend/"]
  .map((prefix) => resolve(process.cwd(), `${prefix}src/features/pet-home/components/pet-home.module.css`))
  .find((path) => existsSync(path));
if (!css) throw new Error("Missing pet-home.module.css from the project root");
const stylesheet = readFileSync(css, "utf8");
const declarations = (selector: string) => {
  const start = stylesheet.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Missing selector ${selector}`);
  return stylesheet.slice(start, stylesheet.indexOf("}", start));
};

describe("stage loading affordance (S6: no empty green window)", () => {
  it("paints the field while the 3D chunk loads instead of a bare text node", () => {
    const { container } = render(<FieldPlaceholder />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("viewBox")).toBe("0 0 100 100");
    expect(svg.getAttribute("preserveAspectRatio")).toBe("none");
    // Purely decorative: nothing inside announces itself to assistive tech.
    expect(container.querySelector('[data-testid="field-backdrop"]')!.getAttribute("aria-hidden")).toBe("true");
    // The plate is the field green; the lattice is painted over it.
    expect(plate(container).getAttribute("class")).toBe(styles.fieldPlate);
    expect(lattice(container).getAttribute("class")).toBe(styles.fieldLine);
    expect(lattice(container).getAttribute("d")).toMatch(/^M /);
    // It must not be an empty rectangle: the plate and its grid both have geometry.
    expect(plate(container).getAttribute("points")!.split(" ").length).toBeGreaterThanOrEqual(4);
    expect(lattice(container).getAttribute("d")).toContain("L ");
  });

  it("keeps the loading state announceable without showing loose text", () => {
    render(<FieldPlaceholder />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain(DEFAULT_PET_NAME);
    // Visually hidden, so the only thing the player sees is the field affordance.
    expect(status.className).toBe(styles.srOnly);
  });

  it("frames the placeholder exactly like the loaded field backdrop", () => {
    const loading = render(<FieldPlaceholder />);
    const loadingPlate = plate(loading.container).getAttribute("points");
    const loadingPath = lattice(loading.container).getAttribute("d");
    loading.unmount();
    const loaded = render(<FieldBackdrop />);
    // Same colour and same framing: arriving at the field is not a visual jump.
    expect(plate(loaded.container).getAttribute("points")).toBe(loadingPlate);
    expect(lattice(loaded.container).getAttribute("d")).toBe(loadingPath);
    expect(loaded.container.firstElementChild!.className).toContain(styles.fieldBackdrop);
  });

  it("shares the loaded field's green and framing tokens, not a second copy of them (S6)", () => {
    // The 3D ground is unlit, so the exact sRGB it emits is FIELD_PALETTE.ground.
    // The affordance paints that same value: there is no second green anywhere.
    const backdrop = declarations(".fieldBackdrop");
    expect(backdrop).toContain(`--field-ground: ${FIELD_PALETTE.ground};`);
    expect(backdrop).toContain(`--field-line: ${FIELD_PALETTE.line};`);
    expect(declarations(".fieldPlate")).toMatch(/fill:\s*var\(--field-ground\)/);
    expect(declarations(".fieldLine")).toMatch(/stroke:\s*var\(--field-line\)/);

    // Framing token: the overview camera the viewer applies and the plate height the
    // 3D field mesh is mounted at, projected with the renderer's own pinhole camera.
    const pose = dioramaCameraPose({
      ...homeCameraView({
        yawDeg: FIELD_VIEW.yawDeg,
        zoom: 1,
        focus: false,
        modelScale: CAT_MODEL_SCALE,
      }),
      elevationDeg: FIELD_VIEW.elevationDeg,
    });
    const expected = fieldBackdropGeometry(pose, catGroundY(CAT_MODEL_SCALE));
    const loading = render(<FieldPlaceholder />);
    expect(plate(loading.container).getAttribute("points")).toBe(platePointsAttribute(expected.plate));
    expect(lattice(loading.container).getAttribute("d")).toBe(latticePathData(expected.lattice));
    loading.unmount();

    // Rendering without props must resolve to the very same tokens: the default is
    // the live camera state, so the first WebGL frame cannot land on another pose.
    const defaults = render(<FieldBackdrop />);
    const explicit = render(
      <FieldBackdrop modelScale={CAT_MODEL_SCALE} yawDeg={FIELD_VIEW.yawDeg} zoom={1} />,
    );
    expect(plate(defaults.container).getAttribute("points"))
      .toBe(plate(explicit.container).getAttribute("points"));
    expect(lattice(defaults.container).getAttribute("d"))
      .toBe(lattice(explicit.container).getAttribute("d"));

    // One line per cell edge in both directions: 34 lines, never an empty rectangle.
    expect((lattice(defaults.container).getAttribute("d")!.match(/M /g) ?? []).length)
      .toBe(2 * (FIELD_SIZE + 1));
  });
});
