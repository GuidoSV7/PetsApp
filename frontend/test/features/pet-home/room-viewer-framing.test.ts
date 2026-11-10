import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import {
  dioramaCameraPose,
  FIELD_VIEW,
  focusFraming,
  nextDioramaYaw,
  nextDioramaZoom,
  overviewFraming,
  resolveDioramaRadius,
  tweenProgress,
} from "@/features/pet-home/field-view";
import { FIELD_HALF } from "@/features/pet-home/room-grid";
import {
  CAT_MODEL_SCALE,
  PET_FRAME,
  catGroundY,
  catPartWorldY,
} from "@/features/pet-home/pet-layout";
import { CAT_ANATOMY } from "@/features/pet-home/cat-anatomy";

/** Same projection the renderer uses: one 4:5 viewport, one perspective camera. */
function project(pose: { position: readonly [number, number, number]; target: readonly [number, number, number] }, point: readonly [number, number, number]) {
  const camera = new PerspectiveCamera(FIELD_VIEW.fovDeg, PET_FRAME.aspectWidth / PET_FRAME.aspectHeight, 0.01, 200);
  camera.position.fromArray(pose.position);
  camera.lookAt(new Vector3().fromArray(pose.target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  const projected = new Vector3().fromArray(point).project(camera);
  return { x: projected.x, y: projected.y, camera };
}

/** Rest paw bottom of the neutral A1 rig, before the model scale. */
const restPawBottom = Math.min(
  ...CAT_ANATOMY.filter((part) => part.id.startsWith("paw"))
    .map((part) => part.position[1] - part.args[1] / 2),
);
/** The field plate sits on the A2 rig ground, so every field anchor carries that Y. */
const FLOOR_Y = catGroundY(CAT_MODEL_SCALE);
const frontPaw = CAT_ANATOMY.find((part) => part.id === "pawFL")!;
const pawAnchor = [0, FLOOR_Y, frontPaw.position[2] * CAT_MODEL_SCALE] as const;
/** S1: there are no walls left, so the overview band tops out on the field's far corner. */
const farCornerAnchor = [-FIELD_HALF, FLOOR_Y, -FIELD_HALF] as const;
/** Anatomy parts are authored around the rig root (`Cat3DModel` group at
 * -0.22), not around the paw plane, so a local part Y is `catPartWorldY`.
 */
const catAnchor = (localY: number, localZ: number) =>
  [0, catPartWorldY(localY, CAT_MODEL_SCALE), localZ * CAT_MODEL_SCALE] as const;
const partAnchor = (id: string, edge: "top" | "bottom" = "bottom", face = false) => {
  const part = CAT_ANATOMY.find((candidate) => candidate.id === id)!;
  const localY = edge === "top" ? part.position[1] + part.args[1] / 2 : part.position[1] - part.args[1] / 2;
  const localZ = face ? part.position[2] + part.args[2] / 2 : part.position[2];
  return catAnchor(localY, localZ);
};

/** Projected plate outline, in the order north-west, north-east, south-east, south-west. */
function plateCorners() {
  return [
    [-FIELD_HALF, -FIELD_HALF],
    [FIELD_HALF, -FIELD_HALF],
    [FIELD_HALF, FIELD_HALF],
    [-FIELD_HALF, FIELD_HALF],
  ].map(([x, z]) => [x, FLOOR_Y, z] as [number, number, number]);
}

/** True when a frame point lies inside the convex projected plate. */
function insidePlate(point: { x: number; y: number }, corners: { x: number; y: number }[]) {
  let sign = 0;
  for (let index = 0; index < corners.length; index++) {
    const a = corners[index];
    const b = corners[(index + 1) % corners.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-9) continue;
    const current = Math.sign(cross);
    if (sign === 0) sign = current;
    else if (current !== sign) return false;
  }
  return true;
}

describe("diorama framing (S1/S2: open field, three-quarter diorama, paws on the lower third)", () => {
  it("derives the overview radius from the field's far corner and the rig paw plane", () => {
    const framing = overviewFraming();
    expect(framing.radius).toBeGreaterThan(0);
    expect(framing.targetY).toBeGreaterThan(0);
    const pose = dioramaCameraPose({ ...framing, yawDeg: FIELD_VIEW.yawDeg, elevationDeg: FIELD_VIEW.elevationDeg });
    expect(project(pose, pawAnchor).y).toBeCloseTo(FIELD_VIEW.lowerNdcY, 9);
    expect(project(pose, farCornerAnchor).y).toBeCloseTo(FIELD_VIEW.upperNdcY, 9);
  });

  it("keeps the paws in the lower third and the far corner in frame across the whole yaw limit", () => {
    const framing = overviewFraming();
    for (const yawDeg of [FIELD_VIEW.yawDeg - FIELD_VIEW.yawLimitDeg, FIELD_VIEW.yawDeg, FIELD_VIEW.yawDeg + FIELD_VIEW.yawLimitDeg]) {
      const pose = dioramaCameraPose({ ...framing, yawDeg, elevationDeg: FIELD_VIEW.elevationDeg });
      const paw = project(pose, pawAnchor).y;
      expect(paw).toBeLessThan(-1 / 3);
      expect(paw).toBeGreaterThan(-0.6);
      const far = project(pose, farCornerAnchor);
      expect(far.y).toBeLessThan(1);
      expect(far.y).toBeGreaterThan(0.75);
      expect(Math.abs(far.x)).toBeLessThan(0.9);
      // The plate runs past the bottom of the frame, so the field reads as open
      // instead of ending in a visible edge right under the cat.
      const corners = plateCorners().map((corner) => project(pose, corner));
      expect(insidePlate({ x: 0, y: -0.98 }, corners)).toBe(true);
      expect(insidePlate({ x: -0.9, y: -0.98 }, corners)).toBe(true);
      expect(insidePlate({ x: 0.9, y: -0.98 }, corners)).toBe(true);
      expect(pose.position[1]).toBeGreaterThan(FLOOR_Y + 1);
    }
  });

  it("keeps the paws on the lower third across the whole elevation limit", () => {
    const framing = overviewFraming();
    for (const elevationDeg of [FIELD_VIEW.elevationDeg - FIELD_VIEW.elevationLimitDeg, FIELD_VIEW.elevationDeg, FIELD_VIEW.elevationDeg + FIELD_VIEW.elevationLimitDeg]) {
      const pose = dioramaCameraPose({ ...framing, yawDeg: FIELD_VIEW.yawDeg, elevationDeg });
      // Elevation is a bounded authoring value, not a re-solve: ±5° moves the paw
      // by at most ~0.025 NDC, so the lower-third rule survives the whole band.
      expect(project(pose, pawAnchor).y).toBeCloseTo(FIELD_VIEW.lowerNdcY, 1);
      expect(project(pose, pawAnchor).y).toBeLessThan(-1 / 3);
      expect(pose.position[1]).toBeGreaterThan(FLOOR_Y + 1);
    }
  });

  it("keeps the cat the visual focus of the open field", () => {
    const pose = dioramaCameraPose({ ...overviewFraming(), yawDeg: FIELD_VIEW.yawDeg, elevationDeg: FIELD_VIEW.elevationDeg });
    const paw = project(pose, pawAnchor).y;
    const earTop = project(pose, partAnchor("earL", "top")).y;
    const chin = project(pose, partAnchor("head", "bottom", true)).y;
    // The cat is taller than a third of the frame and fully inside it, so the
    // 16 × 16 field never reduces it to a speck.
    expect((earTop - paw) / 2).toBeGreaterThan(0.25);
    expect(earTop).toBeLessThan(1);
    expect(chin).toBeGreaterThan(-1);
    expect(chin).toBeGreaterThan(paw);
  });

  it("focuses the real head: the authored anchors land on the authored NDC band", () => {
    const focus = focusFraming();
    const pose = dioramaCameraPose({ ...focus, yawDeg: FIELD_VIEW.yawDeg, elevationDeg: FIELD_VIEW.elevationDeg });
    // RED before the rig-root fix: the head anchors were solved against the paw
    // plane, so the real head landed ~0.75 NDC higher and the ears left the frame.
    expect(project(pose, partAnchor("head", "bottom", true)).y).toBeCloseTo(FIELD_VIEW.focusLowerNdcY, 6);
    expect(project(pose, partAnchor("earL", "top")).y).toBeCloseTo(FIELD_VIEW.focusUpperNdcY, 6);
  });

  it("focuses the head so eyes stay readable and the whole head is inside the frame", () => {
    const focus = focusFraming();
    const overview = overviewFraming();
    expect(focus.radius).toBeLessThan(overview.radius);
    const pose = dioramaCameraPose({ ...focus, yawDeg: FIELD_VIEW.yawDeg, elevationDeg: FIELD_VIEW.elevationDeg });
    // The browser capture cropped the ear tips before this anchor fix; the eyes
    // must stay readable near the middle of the frame and nothing may leave it.
    const eye = project(pose, catAnchor(0.78, 0.46));
    expect(Math.abs(eye.y)).toBeLessThan(0.25);
    expect(Math.abs(eye.x)).toBeLessThan(0.25);
    const earTop = project(pose, partAnchor("earL", "top"));
    expect(earTop.y).toBeGreaterThan(0.3);
    expect(earTop.y).toBeLessThanOrEqual(0.75);
    const chin = project(pose, partAnchor("head", "bottom", true));
    expect(chin.y).toBeGreaterThanOrEqual(-0.75);
    expect(chin.y).toBeLessThan(0);
    // The camera stays on the open side of the plate.
    expect(pose.position[0]).toBeGreaterThan(-FIELD_HALF);
    expect(pose.position[2]).toBeGreaterThan(-FIELD_HALF);
    expect(pose.position[1]).toBeGreaterThan(catGroundY(CAT_MODEL_SCALE));
  });
});

describe("bounded and accessible camera controls (S1: ±20° yaw, bounded zoom)", () => {
  it("clamps yaw to the frozen diorama limits and ignores non-finite steps", () => {
    expect(FIELD_VIEW.yawLimitDeg).toBe(20);
    expect(nextDioramaYaw(FIELD_VIEW.yawDeg, 10)).toBe(55);
    expect(nextDioramaYaw(FIELD_VIEW.yawDeg, -10)).toBe(35);
    expect(nextDioramaYaw(FIELD_VIEW.yawDeg, 90)).toBe(65);
    expect(nextDioramaYaw(FIELD_VIEW.yawDeg, -90)).toBe(25);
    expect(nextDioramaYaw(25, -10)).toBe(25);
    expect(nextDioramaYaw(65, 10)).toBe(65);
    expect(nextDioramaYaw(45, Number.NaN)).toBe(45);
  });

  it("clamps zoom inside the plan range and keeps a positive radius", () => {
    const overview = overviewFraming().radius;
    expect(nextDioramaZoom(1, 0.1)).toBeCloseTo(1.1, 9);
    expect(nextDioramaZoom(1.2, 0.1)).toBeCloseTo(FIELD_VIEW.zoomRange[1], 9);
    expect(nextDioramaZoom(0.8, -0.1)).toBeCloseTo(FIELD_VIEW.zoomRange[0], 9);
    expect(nextDioramaZoom(1, Number.NaN)).toBe(1);
    expect(resolveDioramaRadius(overview, FIELD_VIEW.zoomRange[0])).toBeCloseTo(overview * 0.8, 9);
    expect(resolveDioramaRadius(overview, 50)).toBeCloseTo(overview * FIELD_VIEW.zoomRange[1], 9);
  });

  it("cuts the focus tween under reduced motion and eases in exactly the bounded duration", () => {
    expect(FIELD_VIEW.focusMs).toBe(250);
    expect(tweenProgress(1000, 1000, false)).toBe(0);
    expect(tweenProgress(1000, 1125, false)).toBeCloseTo(0.5, 9);
    expect(tweenProgress(1000, 1250, false)).toBe(1);
    expect(tweenProgress(1000, 9999, false)).toBe(1);
    expect(tweenProgress(1000, 1000, true)).toBe(1);
  });
});

describe("home frame sizing contract (S1: 4:5 on mobile and desktop)", () => {
  const stylesheet = (name: string) => readFileSync(new URL(`../../../src/${name}`, import.meta.url), "utf8");
  function block(css: string, selector: string) {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`Missing selector ${selector}`);
    const end = css.indexOf("}", start);
    return css.slice(start, end);
  }
  const petHome = stylesheet("features/pet-home/components/pet-home.module.css");
  const home = stylesheet("app/home.module.css");

  it("keeps the plan's 4:5 viewer and never reintroduces a square or a frozen inline cap", () => {
    const frame = block(petHome, ".petFrame");
    expect(frame).toMatch(/aspect-ratio:\s*4\s*\/\s*5/);
    expect(frame).not.toMatch(/aspect-ratio:\s*1\s*;/);
    expect(frame).toMatch(/width:\s*min\(100%, var\(--pet-frame-max\)/);
    expect(frame).toMatch(/var\(--pet-frame-height-cap\)/);
    expect(frame).not.toMatch(/38dvh/);
    expect(PET_FRAME.aspectWidth / PET_FRAME.aspectHeight).toBe(0.8);
  });

  it("responds to width and height on desktop instead of growing without a cap", () => {
    const frame = block(petHome, ".petFrame");
    const heightCap = /--pet-frame-height-cap:\s*min\((\d+)dvh,\s*(\d+)px\)/.exec(petHome);
    expect(heightCap).not.toBeNull();
    expect(Number(heightCap![1])).toBe(PET_FRAME.desktopMaxHeightDvh);
    expect(Number(heightCap![2])).toBe(PET_FRAME.desktopMaxHeightPx);
    expect(PET_FRAME.desktopMaxHeightDvh).toBeGreaterThan(40);
    expect(PET_FRAME.desktopMaxHeightDvh).toBeLessThan(90);
    expect(frame).toMatch(/min-height:\s*0/);
    const desktop = petHome.slice(petHome.indexOf(`@media (min-width: ${PET_FRAME.desktopBreakpointPx}px)`));
    expect(desktop).toMatch(new RegExp(`--pet-frame-max:\\s*${PET_FRAME.desktopMaxWidthPx}px`));
  });

  it("lets the authenticated column breathe instead of pinning art to 480px", () => {
    const playMain = block(home, ".contenedorPlay .main");
    const maxWidth = /max-width:\s*(\d+)px/.exec(playMain);
    expect(maxWidth).not.toBeNull();
    expect(Number(maxWidth![1])).toBeGreaterThanOrEqual(600);
    const play = block(home, ".contenedorPlay");
    expect(play).not.toMatch(/pet-room-bg\.png/);
    expect(play).toMatch(/min-height:\s*100dvh/);
    expect(play).toMatch(/height:\s*auto/);
  });

  it("keeps the derived rig ground equal to the A2 floor oracle, not the old -0.62 plane", () => {
    expect(catGroundY(CAT_MODEL_SCALE)).toBeCloseTo(-0.22 + CAT_MODEL_SCALE * restPawBottom, 12);
    expect(catGroundY(CAT_MODEL_SCALE)).toBeCloseTo(-0.4462, 4);
    expect(catGroundY(1.5)).toBeCloseTo(-0.22 + 1.5 * restPawBottom, 12);
  });
});
