/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector3,
} from "three";
import {
  Cat3DViewer,
  dioramaCameraPose,
  overviewFraming,
  FIELD_VIEW,
} from "@/features/pet-home/components/Cat3DViewer";
import { homeCameraView } from "@/features/pet-home/field-view";
import { fieldBackdropGeometry, platePointsAttribute } from "@/features/pet-home/field-backdrop";
import { FIELD_HALF, FIELD_SIZE, cellCenter } from "@/features/pet-home/room-grid";
import {
  CAT_MODEL_SCALE,
  ROOM_SHADOW_OFFSET,
  catGroundY,
} from "@/features/pet-home/pet-layout";
import { FIELD_LINE_LIFT } from "@/features/pet-home/field-geometry";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";

const three = vi.hoisted(() => ({
  scene: null as unknown as Scene,
  camera: null as unknown as PerspectiveCamera,
  raycaster: null as unknown as Raycaster,
  clock: { getDelta: vi.fn(() => 0.016) },
}));
const shadowProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
const canvasProps = vi.hoisted(() => [] as Record<string, unknown>[]);
const modelProps = vi.hoisted(() => [] as Record<string, unknown>[]);

vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode }) => {
    canvasProps.push(props);
    return React.createElement(
      "div",
      null,
      React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && typeof child.type !== "string",
      ) as React.ReactNode[],
    );
  },
  useThree: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      scene: three.scene,
      camera: three.camera,
      raycaster: three.raycaster,
      clock: three.clock,
      size: { width: 400, height: 500 },
      gl: { domElement: document.createElement("canvas"), setPixelRatio: () => undefined },
      invalidate: () => undefined,
    }),
  useFrame: () => undefined,
}));
vi.mock("@react-three/drei", () => ({
  ContactShadows: (props: Record<string, unknown>) => {
    shadowProps.current = props;
    return null;
  },
  OrbitControls: () => null,
  PerformanceMonitor: () => null,
  Stats: () => null,
}));
vi.mock("@/features/pet-home/components/Cat3DModel", () => ({
  Cat3DModel: (props: Record<string, unknown>) => {
    modelProps.push(props);
    return null;
  },
}));

/** Minimal IntersectionObserver so the viewer can pause offscreen. */
let observers: { callback: IntersectionObserverCallback }[] = [];
class FakeIntersectionObserver {
  private entry: { callback: IntersectionObserverCallback };
  constructor(callback: IntersectionObserverCallback) {
    this.entry = { callback };
    observers.push(this.entry);
  }
  observe() {}
  unobserve() {}
  disconnect() {
    observers = observers.filter((entry) => entry !== this.entry);
  }
  takeRecords() { return []; }
}

beforeEach(() => {
  three.scene = new Scene();
  three.camera = new PerspectiveCamera();
  three.raycaster = new Raycaster();
  observers = [];
  shadowProps.current = null;
  canvasProps.length = 0;
  modelProps.length = 0;
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  delete (document as unknown as { visibilityState?: string }).visibilityState;
});

const home = () => render(React.createElement(Cat3DViewer, { variant: "home", colors: DEFAULT_GREY_COAT }));
const meshesIn = () => three.scene.children.filter((child): child is Mesh => child instanceof Mesh);
const FLOOR_Y = catGroundY(CAT_MODEL_SCALE);

it("mounts the open field on the first commit: one flat mesh, one draw, no room shell (S1/S2)", () => {
  // No idle deferral: the field exists in the same commit that mounts the canvas,
  // so the very first painted frame is the field and never an empty rectangle.
  const { unmount } = home();
  expect(meshesIn()).toHaveLength(1);
  const [field] = meshesIn();
  expect(field.name).toBe("procedural-field");
  expect(field.layers.mask).toBe(2);
  expect(field.geometry.groups).toEqual([]);
  expect(Array.isArray(field.material)).toBe(false);
  // 4 plate vertices + 2 × 17 lattice strips; the voxelite room shell is not here.
  expect(field.geometry.getAttribute("position").count).toBe(140);
  field.geometry.computeBoundingBox();
  const box = field.geometry.boundingBox!;
  expect(box.max.x - box.min.x).toBeCloseTo(2 * FIELD_HALF, 6);
  expect(box.max.z - box.min.z).toBeCloseTo(2 * FIELD_HALF, 6);
  expect(box.max.y - box.min.y).toBeCloseTo(FIELD_LINE_LIFT, 6);
  const disposed: string[] = [];
  field.geometry.addEventListener("dispose", () => disposed.push("geometry"));
  (field.material as { addEventListener: (key: string, fn: () => void) => void })
    .addEventListener("dispose", () => disposed.push("material"));
  unmount();
  expect(meshesIn()).toHaveLength(0);
  expect(disposed.sort()).toEqual(["geometry", "material"]);
});

it("sits the field plate on the A2 rig ground so the paws touch in every pose", () => {
  home();
  const [field] = meshesIn();
  expect(field.position.y).toBeCloseTo(FLOOR_Y, 6);
  // The A2 floor oracle keeps every planted paw on this plane, so the shadow
  // plane must be the field plate, never the old hardcoded -0.62.
  expect(field.position.y).toBeCloseTo(-0.4462, 4);
  expect(field.position.y).not.toBeCloseTo(-0.62, 2);
  field.geometry.computeBoundingBox();
  expect(field.geometry.boundingBox!.min.y + field.position.y).toBeCloseTo(FLOOR_Y, 6);
});

it("gives the main camera and raycaster layer 1 while the depth pass stays on layer 0", () => {
  home();
  const [field] = meshesIn();
  expect(three.camera.layers.mask).toBe(3);
  expect(three.raycaster.layers.mask).toBe(3);
  expect(three.camera.layers.test(field.layers)).toBe(true);
  expect(three.raycaster.layers.test(field.layers)).toBe(true);
  // Drei's contact-shadow camera is a plain OrthographicCamera (default layer 0).
  const shadowCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  expect(shadowCamera.layers.mask).toBe(1);
  expect(shadowCamera.layers.test(field.layers)).toBe(false);
  // The plate is reachable for grid picking from the sky, one cell per tile.
  field.updateMatrixWorld(true);
  const cell = cellCenter(FIELD_SIZE / 2, FIELD_SIZE / 2)!;
  const ray = new Raycaster(
    new Vector3(cell.x, field.position.y + 2, cell.z),
    new Vector3(0, -1, 0),
  );
  expect(ray.intersectObject(field)).toEqual([]);
  ray.layers.enable(1);
  const hit = ray.intersectObject(field)[0];
  expect(hit).toBeDefined();
  expect(hit.point.y).toBeCloseTo(field.position.y, 4);
  hit.face!.normal.toArray().forEach((value, axis) => expect(value).toBeCloseTo([0, 1, 0][axis], 6));
});

it("puts the soft contact shadow on the field plate, for the cat only", () => {
  home();
  const props = shadowProps.current!;
  expect(props.position).toEqual([0, catGroundY(CAT_MODEL_SCALE) + ROOM_SHADOW_OFFSET, 0]);
  // Owner art direction: the shadow has to read on the green field.
  expect(props.opacity).toBeCloseTo(0.45, 6);
  expect(props.blur).toBeCloseTo(2.0, 6);
  expect(props.resolution).toBe(256);
  expect(props.frames).toBeUndefined();
  expect(Number(props.scale)).toBeGreaterThan(1);
  expect(Number(props.scale)).toBeLessThan(2 * FIELD_HALF);
});

it("keeps the loading backdrop on the live camera framing while the player rotates and zooms (S6)", async () => {
  const { container } = home();
  const plate = () => container.querySelector('[data-testid="field-backdrop"] polygon')!.getAttribute("points");
  const expected = (yawDeg: number, zoom: number) => {
    const pose = dioramaCameraPose({
      ...homeCameraView({ yawDeg, zoom, focus: false, modelScale: CAT_MODEL_SCALE }),
      elevationDeg: FIELD_VIEW.elevationDeg,
    });
    return platePointsAttribute(fieldBackdropGeometry(pose, FLOOR_Y).plate);
  };
  // Before any WebGL frame the placeholder-equivalent backdrop is already there.
  expect(plate()).toBe(expected(FIELD_VIEW.yawDeg, 1));
  fireEvent.click(await screen.findByRole("button", { name: "Girar la cámara a la derecha" }));
  expect(plate()).toBe(expected(FIELD_VIEW.yawDeg + FIELD_VIEW.yawStepDeg, 1));
  fireEvent.click(screen.getByRole("button", { name: "Alejar la cámara" }));
  expect(plate()).toBe(expected(FIELD_VIEW.yawDeg + FIELD_VIEW.yawStepDeg, 1 + FIELD_VIEW.zoomStep));
});

it("pauses the render loop offscreen and on a hidden document, then resumes without a clock jump", async () => {
  home();
  const frameloop = () => canvasProps.at(-1)!.frameloop;
  expect(frameloop()).toBe("always");
  const entry = observers.at(-1)!;
  entry.callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
  await waitFor(() => expect(frameloop()).toBe("never"));
  three.clock.getDelta.mockClear();
  entry.callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
  await waitFor(() => expect(frameloop()).toBe("always"));
  // Swallow the paused span so A2 never sees a multi-second delta on return.
  expect(three.clock.getDelta).toHaveBeenCalled();
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  document.dispatchEvent(new Event("visibilitychange"));
  await waitFor(() => expect(frameloop()).toBe("never"));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  document.dispatchEvent(new Event("visibilitychange"));
  await waitFor(() => expect(frameloop()).toBe("always"));
});

it("restores the previous camera and raycaster masks when the home field unmounts", () => {
  three.camera.layers.mask = 1;
  three.raycaster.layers.mask = 1;
  const { unmount } = home();
  expect(meshesIn()).toHaveLength(1);
  expect(three.camera.layers.mask).toBe(3);
  unmount();
  expect(three.camera.layers.mask).toBe(1);
  expect(three.raycaster.layers.mask).toBe(1);
});

it("places the home camera on the solved open-field diorama pose at the plan FOV", () => {
  home();
  const framing = overviewFraming(CAT_MODEL_SCALE);
  const pose = dioramaCameraPose({ ...framing, yawDeg: FIELD_VIEW.yawDeg, elevationDeg: FIELD_VIEW.elevationDeg });
  expect(three.camera.fov).toBe(FIELD_VIEW.fovDeg);
  expect(three.camera.position.x).toBeCloseTo(pose.position[0], 6);
  expect(three.camera.position.y).toBeCloseTo(pose.position[1], 6);
  expect(three.camera.position.z).toBeCloseTo(pose.position[2], 6);
  expect(three.camera.position.y).toBeGreaterThan(2);
});

it("keeps the admin preview free of the field, the diorama camera and the mask changes", async () => {
  render(React.createElement(Cat3DViewer, { colors: DEFAULT_GREY_COAT }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(meshesIn()).toHaveLength(0);
  expect(three.camera.layers.mask).toBe(1);
  expect(three.raycaster.layers.mask).toBe(1);
  expect(canvasProps.at(-1)!.camera).toEqual({ position: [0, 0.42, 3.05], fov: 28 });
  expect(canvasProps.at(-1)!.flat).toBe(true);
  expect(modelProps.at(-1)!.orbiting).toBe(false);
});
