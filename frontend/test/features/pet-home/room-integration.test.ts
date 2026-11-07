/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
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
  ROOM_VIEW,
} from "@/features/pet-home/components/Cat3DViewer";
import { ROOM_HALF, ROOM_LENGTH, cellCenter } from "@/features/pet-home/room-grid";
import {
  CAT_MODEL_SCALE,
  ROOM_SHADOW_OFFSET,
  catGroundY,
} from "@/features/pet-home/pet-layout";
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
const roomIn = () => three.scene.children.filter((child): child is Mesh => child instanceof Mesh);

it("mounts one procedural room on layer 1 and releases it on unmount", async () => {
  const { unmount } = home();
  await waitFor(() => expect(roomIn()).toHaveLength(1), { timeout: 30_000 });
  const [room] = roomIn();
  expect(room.name).toBe("procedural-room");
  expect(room.layers.mask).toBe(2);
  // One merged geometry and one material: a single main draw, no groups.
  expect(room.geometry.groups).toEqual([]);
  expect(Array.isArray(room.material)).toBe(false);
  expect(room.geometry.getAttribute("position").count).toBeGreaterThan(1000);
  const disposed: string[] = [];
  room.geometry.addEventListener("dispose", () => disposed.push("geometry"));
  (room.material as { addEventListener: (key: string, fn: () => void) => void })
    .addEventListener("dispose", () => disposed.push("material"));
  unmount();
  expect(roomIn()).toHaveLength(0);
  expect(disposed.sort()).toEqual(["geometry", "material"]);
}, 60_000);

it("sits the room floor on the A2 rig ground so the paws touch in every pose", async () => {
  home();
  await waitFor(() => expect(roomIn()).toHaveLength(1), { timeout: 30_000 });
  const [room] = roomIn();
  expect(room.position.y).toBeCloseTo(catGroundY(CAT_MODEL_SCALE), 6);
  // The A2 floor oracle keeps every planted paw on this plane, so the shadow
  // plane must be the room floor, never the old hardcoded -0.62.
  expect(room.position.y).toBeCloseTo(-0.4462, 4);
  expect(room.position.y).not.toBeCloseTo(-0.62, 2);
}, 60_000);

it("gives the main camera and raycaster layer 1 while the depth pass stays on layer 0", async () => {
  home();
  await waitFor(() => expect(roomIn()).toHaveLength(1), { timeout: 30_000 });
  const [room] = roomIn();
  expect(three.camera.layers.mask).toBe(3);
  expect(three.raycaster.layers.mask).toBe(3);
  expect(three.camera.layers.test(room.layers)).toBe(true);
  expect(three.raycaster.layers.test(room.layers)).toBe(true);
  // Drei's contact-shadow camera is a plain OrthographicCamera (default layer 0).
  const shadowCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 2);
  expect(shadowCamera.layers.mask).toBe(1);
  expect(shadowCamera.layers.test(room.layers)).toBe(false);
  // The room floor is reachable for grid picking from the sky.
  room.updateMatrixWorld(true);
  const cell = cellCenter(4, 4)!;
  const ray = new Raycaster(
    new Vector3(cell.x, room.position.y + ROOM_LENGTH, cell.z),
    new Vector3(0, -1, 0),
  );
  expect(ray.intersectObject(room)).toEqual([]);
  ray.layers.enable(1);
  const hit = ray.intersectObject(room)[0];
  expect(hit).toBeDefined();
  expect(hit.point.y).toBeCloseTo(room.position.y, 4);
}, 60_000);

it("puts the soft contact shadow on the room floor, for the cat only", async () => {
  home();
  await waitFor(() => expect(roomIn()).toHaveLength(1), { timeout: 30_000 });
  const props = shadowProps.current!;
  expect(props.position).toEqual([0, catGroundY(CAT_MODEL_SCALE) + ROOM_SHADOW_OFFSET, 0]);
  // Owner art direction: the shadow has to read on the warm floor.
  expect(props.opacity).toBeCloseTo(0.45, 6);
  expect(props.blur).toBeCloseTo(2.0, 6);
  expect(props.resolution).toBe(256);
  expect(props.frames).toBeUndefined();
  expect(Number(props.scale)).toBeGreaterThan(ROOM_LENGTH);
  expect(Number(props.scale)).toBeLessThan(2 * ROOM_HALF);
}, 60_000);

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
}, 60_000);

it("restores the previous camera and raycaster masks when the home room unmounts", async () => {
  three.camera.layers.mask = 1;
  three.raycaster.layers.mask = 1;
  const { unmount } = home();
  await waitFor(() => expect(roomIn()).toHaveLength(1), { timeout: 30_000 });
  expect(three.camera.layers.mask).toBe(3);
  unmount();
  expect(three.camera.layers.mask).toBe(1);
  expect(three.raycaster.layers.mask).toBe(1);
}, 60_000);

it("places the home camera on the solved diorama pose at the plan FOV", () => {
  home();
  const framing = overviewFraming(CAT_MODEL_SCALE);
  const pose = dioramaCameraPose({ ...framing, yawDeg: ROOM_VIEW.yawDeg, elevationDeg: ROOM_VIEW.elevationDeg });
  expect(three.camera.fov).toBe(ROOM_VIEW.fovDeg);
  expect(three.camera.position.x).toBeCloseTo(pose.position[0], 6);
  expect(three.camera.position.y).toBeCloseTo(pose.position[1], 6);
  expect(three.camera.position.z).toBeCloseTo(pose.position[2], 6);
  expect(three.camera.position.y).toBeGreaterThan(2);
});

it("keeps the admin preview free of the room, the diorama camera and the mask changes", async () => {
  render(React.createElement(Cat3DViewer, { colors: DEFAULT_GREY_COAT }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(roomIn()).toHaveLength(0);
  expect(three.camera.layers.mask).toBe(1);
  expect(three.raycaster.layers.mask).toBe(1);
  expect(canvasProps.at(-1)!.camera).toEqual({ position: [0, 0.42, 3.05], fov: 28 });
  expect(canvasProps.at(-1)!.flat).toBe(true);
  expect(modelProps.at(-1)!.orbiting).toBe(false);
});
