/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  CAT_VIEW_LIGHTS,
  CAT_VIEW_SHADOW,
  Cat3DViewer,
  ROOM_VIEW,
} from "@/features/pet-home/components/Cat3DViewer";
import { catRoleMaterials } from "@/features/pet-home/components/Cat3DModel";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import {
  DEFAULT_GREY_COAT,
  type PetCoatColors,
} from "@/features/pet-home/extract-coat-colors";
import { CAT_MODEL_SCALE, catGroundY } from "@/features/pet-home/pet-layout";
import { PREVIEW_PET_NEEDS } from "@/features/pet-home/pet-stats";

type MonitorProps = {
  factor: number;
  step: number;
  bounds: (refreshRate: number) => [number, number];
  flipflops: number;
  onChange: (api: { factor: number }) => void;
  onFallback: (api: { factor: number }) => void;
};
const { procedural, canvas, controls, monitor, shadow, stats, statsCleanup } = vi.hoisted(() => ({
  procedural: vi.fn(), canvas: vi.fn(), controls: vi.fn(), monitor: vi.fn(),
  shadow: vi.fn(), stats: vi.fn(), statsCleanup: vi.fn(),
}));
vi.mock("@react-three/fiber", async () => {
  // The home variant reads the live camera/raycaster/clock; the preview does not.
  const THREE = await import("three");
  const state = {
    camera: new THREE.PerspectiveCamera(),
    scene: new THREE.Scene(),
    raycaster: new THREE.Raycaster(),
    clock: { getDelta: () => 0.016 },
  };
  return {
    Canvas: ({ children, ...props }: { children: React.ReactNode }) => {
      canvas(props);
      return <div>{React.Children.toArray(children).filter((child) => React.isValidElement(child) && typeof child.type !== "string")}</div>;
    },
    useThree: (selector: (value: typeof state) => unknown) => selector(state),
    useFrame: () => undefined,
  };
});
vi.mock("@react-three/drei", () => ({
  ContactShadows: (props: unknown) => { shadow(props); return null; },
  PerformanceMonitor: (props: MonitorProps) => { monitor(props); return null; },
  Stats: (props: { parent?: React.RefObject<HTMLElement>; className?: string; showPanel?: number }) => {
    stats(props);
    // Adapter fixture only: real drei DOM/render-loop cleanup is a later browser check.
    React.useEffect(() => {
      const panel = document.createElement("div");
      panel.dataset.testid = "pet-fps-panel";
      panel.className = props.className ?? "";
      (props.parent?.current ?? document.body).appendChild(panel);
      return () => { panel.remove(); statsCleanup(); };
    }, [props.parent, props.className]);
    return null;
  },
  OrbitControls: (props: { onStart: () => void; onEnd: () => void }) => {
    controls(props);
    return <><button onClick={props.onStart}>Orbit start</button><button onClick={props.onEnd}>Orbit end</button></>;
  },
}));
vi.mock("@/features/pet-home/components/Cat3DModel", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/pet-home/components/Cat3DModel")>();
  return {
    ...actual,
    Cat3DModel: (props: { onPetInteract?: () => void }) => {
    procedural(props);
    return <button onClick={props.onPetInteract}>Procedural cat</button>;
    },
  };
});
const originals = [
  [window, "devicePixelRatio"], [navigator, "deviceMemory"], [navigator, "hardwareConcurrency"],
].map(([object, key]) => ({ object: object as object, key: key as string, descriptor: Object.getOwnPropertyDescriptor(object, key as string) }));
function hints(memory: number | undefined, cores: number | undefined, dpr: number) {
  Object.defineProperty(navigator, "deviceMemory", { configurable: true, value: memory });
  Object.defineProperty(navigator, "hardwareConcurrency", { configurable: true, value: cores });
  Object.defineProperty(window, "devicePixelRatio", { configurable: true, value: dpr });
}
const selected = () => canvas.mock.lastCall![0].dpr;
function callbacks(): MonitorProps {
  expect(monitor).toHaveBeenCalled();
  return monitor.mock.lastCall![0];
}
beforeEach(() => { hints(8, 8, 3); window.history.replaceState(null, "", "/"); });
afterEach(() => {
  cleanup(); vi.clearAllMocks(); window.history.replaceState(null, "", "/");
  for (const { object, key, descriptor } of originals) {
    if (descriptor) Object.defineProperty(object, key, descriptor);
    else Reflect.deleteProperty(object, key);
  }
});

describe("Cat3DViewer", () => {
  it("always selects procedural rendering even with an adversarial legacy asset input", () => {
    const legacy = { modelUrl: "/petsapp-api/pet/model/file" };
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} {...legacy} />);
    expect(screen.getByRole("button", { name: "Procedural cat" })).toBeTruthy();
    expect(screen.queryByText("Legacy asset")).toBeNull();
    expect(screen.getByRole("img").getAttribute("aria-label")).not.toContain("Modelo personalizado");
  });

  it("forwards complete patterned coats unchanged while keeping colors-only callers compatible (S7/S11)", () => {
    const colors = { ...DEFAULT_GREY_COAT, pattern: "calico" as const };
    const { rerender } = render(<Cat3DViewer colors={colors} />);
    expect(procedural.mock.lastCall![0].colors).toBe(colors);
    expect(procedural.mock.lastCall![0].colors.pattern).toBe("calico");
    rerender(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(procedural.mock.lastCall![0].colors).toBe(DEFAULT_GREY_COAT);
    expect(Object.hasOwn(procedural.mock.lastCall![0].colors, "pattern")).toBe(false);
  });

  it("preserves procedural inputs, interaction, orbit controls and camera", () => {
    const design = { ...defaultCatDesign(), bodyDepth: 1.2, modelScale: 1.1 };
    const needs = { ...PREVIEW_PET_NEEDS, hunger: 10 };
    const onPetInteract = vi.fn();
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} design={design} needs={needs} yawBias={0.3} reactPulse={4} onPetInteract={onPetInteract} />);
    const forwarded = () => procedural.mock.lastCall![0];
    expect(forwarded()).toEqual({ colors: DEFAULT_GREY_COAT, design, needs, yawBias: 0.3, reactPulse: 4, onPetInteract, orbiting: false });
    expect(forwarded().design).toBe(design);
    expect(forwarded().needs).toBe(needs);
    expect(forwarded().colors).toBe(DEFAULT_GREY_COAT);
    fireEvent.click(screen.getByRole("button", { name: "Procedural cat" }));
    expect(onPetInteract).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Orbit start" }));
    expect(forwarded().orbiting).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Orbit end" }));
    expect(forwarded().orbiting).toBe(false);
    expect(canvas.mock.lastCall![0]).toMatchObject({ camera: { position: [0, 0.42, 3.05], fov: 28 }, gl: { antialias: true, alpha: true } });
    expect(controls.mock.lastCall![0]).toMatchObject({ enablePan: false, enableZoom: false, target: [0, 0.18, 0.05], rotateSpeed: 0.85, dampingFactor: 0.08, enableDamping: true });
  });

  it.each([
    [0.5, 8, 3, 1.25], [1, 8, 3, 1.25], [2, 8, 3, 1.25],
    [2.01, 2, 3, 1.5], [4, undefined, 3, 1.5], [8, 2, 3, 1.75], [8, undefined, 3, 1.75],
    [undefined, 1, 3, 1.25], [undefined, 2, 3, 1.25], [undefined, undefined, 3, 1.5], [undefined, 8, 3, 1.5],
    [8, 8, 1, 1], [8, 8, 1.37, 1.35], [4, 8, 1.49, 1.45], [8, 8, 1.74, 1.7], [2, 8, 1.23, 1.2],
    [8, 8, 0.8, 1], [undefined, 2, 0.8, 1], [8, 8, 1.15, 1.15],
  ])("starts at numeric ceiling for memory=%s cores=%s dpr=%s", (memory, cores, dpr, expected) => {
    hints(memory, cores, dpr!);
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(selected()).toBe(expected);
  });

  it("sets the requested monitor props, including a bounds function and flipflops eight", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(callbacks()).toMatchObject({ factor: 1, step: 0.15, flipflops: 8 });
    expect(callbacks().bounds(60)).toEqual([45, 58]);
    expect(callbacks().bounds(120)).toEqual([45, 58]);
  });

  it("quantizes factor changes, clamps endpoints and preserves selected DPR across orbit rerenders", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    for (const [factor, expected] of [[0.85, 1.6], [0.7, 1.5], [0.55, 1.4], [0.5, 1.35], [0.4, 1.3], [0.2, 1.15], [-1, 1], [2, 1.75]]) {
      act(() => callbacks().onChange({ factor }));
      expect(selected()).toBe(expected);
      fireEvent.click(screen.getByRole("button", { name: "Orbit start" }));
      expect(selected()).toBe(expected);
      expect(procedural.mock.lastCall![0].orbiting).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "Orbit end" }));
      expect(selected()).toBe(expected);
      expect(procedural.mock.lastCall![0].orbiting).toBe(false);
    }
  });

  it("does not schedule rerenders for unchanged quantized values", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    act(() => callbacks().onChange({ factor: 0.5 }));
    expect(selected()).toBe(1.35);
    const renders = canvas.mock.calls.length;
    act(() => { callbacks().onChange({ factor: 0.49 }); callbacks().onChange({ factor: 0.5 }); });
    expect(canvas).toHaveBeenCalledTimes(renders);
  });

  it("latches the final same-frame factor before React commits and ignores every later callback", () => {
    const onPetInteract = vi.fn();
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} onPetInteract={onPetInteract} />);
    act(() => { callbacks().onChange({ factor: 0.7 }); callbacks().onFallback({ factor: 0.2 }); callbacks().onChange({ factor: 1 }); });
    expect(selected()).toBe(1.15);
    act(() => { callbacks().onFallback({ factor: 0 }); callbacks().onChange({ factor: 0 }); });
    fireEvent.click(screen.getByRole("button", { name: "Orbit start" }));
    expect(selected()).toBe(1.15);
    fireEvent.click(screen.getByRole("button", { name: "Orbit end" }));
    expect(selected()).toBe(1.15);
    fireEvent.click(screen.getByRole("button", { name: "Procedural cat" }));
    expect(onPetInteract).toHaveBeenCalledTimes(1);
  });

  it.each(["", "?pet3dStats=0", "?pet3dStats=false", "?pet3dStats=yes"])("leaves Stats unmounted for %s", (search) => {
    window.history.replaceState(null, "", "/" + search);
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(stats).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pet-fps-panel")).toBeNull();
  });

  it("opts into the existing FPS panel with a local parent and cleans it up on unmount", () => {
    window.history.replaceState(null, "", "/?other=ok&pet3dStats=1");
    const { unmount } = render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(stats).toHaveBeenCalled();
    expect(stats.mock.lastCall![0].showPanel).toBe(0);
    expect(stats.mock.lastCall![0].parent.current).not.toBe(document.body);
    expect(screen.getByRole("img").contains(screen.getByTestId("pet-fps-panel"))).toBe(true);
    expect(stats.mock.lastCall![0].className).toBeTruthy();
    unmount();
    expect(statsCleanup).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("pet-fps-panel")).toBeNull();
  });

  it("derives the contact-shadow plane from the rig ground instead of the old -0.62 float", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    // The A2 floor oracle plants every pose on catGroundY(modelScale): root -0.22
    // plus 0.78 × the neutral paw bottom -0.29 = -0.4462, not the hardcoded -0.62.
    const expected = catGroundY(CAT_MODEL_SCALE) + CAT_VIEW_SHADOW.offset;
    expect(expected).toBeCloseTo(-0.4382, 4);
    expect(shadow.mock.lastCall![0]).toEqual({
      resolution: 256,
      position: [0, expected, 0],
      opacity: CAT_VIEW_SHADOW.opacity,
      scale: CAT_VIEW_SHADOW.scale,
      blur: CAT_VIEW_SHADOW.blur,
      far: CAT_VIEW_SHADOW.far,
      color: CAT_VIEW_SHADOW.color,
    });
  });
});

describe("cat look: smooth like the landing dog (S1: better, even texture)", () => {
  it("renders flat with no tone mapping, like the landing dog's HeroIsland canvas", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(canvas.mock.lastCall![0].flat).toBe(true);
  });

  it("replaces ambient with a warm sky / cool ground hemisphere fill and keeps the key lit", () => {
    expect(CAT_VIEW_LIGHTS.hemisphere.args[0]).toBe("#fff6ea");
    expect(CAT_VIEW_LIGHTS.hemisphere.args[1]).toBe("#f4c7a8");
    expect(CAT_VIEW_LIGHTS.hemisphere.args[2]).toBeGreaterThan(0.7);
    expect(CAT_VIEW_LIGHTS.hemisphere.args[2]).toBeLessThan(1.2);
    expect(CAT_VIEW_LIGHTS.key.intensity).toBeGreaterThan(1.2);
    expect(CAT_VIEW_LIGHTS.key.position).toEqual([2.8, 4.2, 2.2]);
    expect(CAT_VIEW_LIGHTS.fill.color).toBe("#d7e8ff");
    expect(CAT_VIEW_LIGHTS.fill.intensity).toBeCloseTo(0.4, 6);
    // The underside stays shaded: the fill never outruns the hemisphere.
    expect(CAT_VIEW_LIGHTS.fill.intensity).toBeLessThan(CAT_VIEW_LIGHTS.key.intensity);
    expect(CAT_VIEW_LIGHTS.rim.intensity).toBeLessThan(CAT_VIEW_LIGHTS.key.intensity);
  });

  it("softens every coat role toward the dog's roughness with no metalness", () => {
    const coat: PetCoatColors = {
      primary: "#8a8f96",
      secondary: "#d8dde3",
      accent: "#c2410c",
    };
    const roles = catRoleMaterials(coat);
    expect(roles.primary.color).toBe(coat.primary);
    expect(roles.secondary.color).toBe(coat.secondary);
    expect(roles.accent.color).toBe(coat.accent);
    for (const role of Object.values(roles)) expect(role.metalness).toBe(0);
    expect(roles.primary.roughness).toBeCloseTo(0.45, 6);
    expect(roles.secondary.roughness).toBeCloseTo(0.48, 6);
    expect(roles.accent.roughness).toBeCloseTo(0.42, 6);
    // Smooth, not shiny: every coat role stays inside the dog's 0.3-0.5 band.
    for (const role of [roles.primary, roles.secondary, roles.accent]) {
      expect(role.roughness).toBeGreaterThanOrEqual(0.3);
      expect(role.roughness).toBeLessThanOrEqual(0.5);
    }
    // The eye and pupil read: dark, glossy, and the pupil keeps its own emissive.
    expect(roles.eye.color).toBe("#1c1c1c");
    expect(roles.pupil.emissive).toBe("#5fd98f");
    expect(roles.pupil.emissiveIntensity).toBeCloseTo(0.28, 6);
  });
});

describe("home diorama camera and accessible rotation (S1/S2)", () => {
  it("turns a cat tap into one pet plus a head focus, never a second care call", () => {
    const onPetInteract = vi.fn();
    render(<Cat3DViewer variant="home" colors={DEFAULT_GREY_COAT} onPetInteract={onPetInteract} />);
    const host = () => screen.getByRole("img");
    expect(host().getAttribute("data-camera-focus")).toBe("overview");
    fireEvent.click(screen.getByRole("button", { name: "Procedural cat" }));
    expect(onPetInteract).toHaveBeenCalledTimes(1);
    expect(host().getAttribute("data-camera-focus")).toBe("head");
    fireEvent.click(screen.getByRole("button", { name: "Ver la habitación completa" }));
    expect(host().getAttribute("data-camera-focus")).toBe("overview");
    expect(onPetInteract).toHaveBeenCalledTimes(1);
  });

  it("rotates and zooms only through the labelled accessible controls, inside the bounds", () => {
    render(<Cat3DViewer variant="home" colors={DEFAULT_GREY_COAT} />);
    const host = () => screen.getByRole("img");
    const yaw = () => Number(host().getAttribute("data-camera-yaw"));
    const zoom = () => Number(host().getAttribute("data-camera-zoom"));
    expect(yaw()).toBe(ROOM_VIEW.yawDeg);
    expect(zoom()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Girar la cámara a la derecha" }));
    expect(yaw()).toBe(ROOM_VIEW.yawDeg + ROOM_VIEW.yawStepDeg);
    for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: "Girar la cámara a la derecha" }));
    expect(yaw()).toBe(ROOM_VIEW.yawDeg + ROOM_VIEW.yawLimitDeg);
    for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole("button", { name: "Girar la cámara a la izquierda" }));
    expect(yaw()).toBe(ROOM_VIEW.yawDeg - ROOM_VIEW.yawLimitDeg);
    // The zoom state is a radius scale: 0.8R is closer, 1.2R is further away.
    for (let i = 0; i < 8; i++) fireEvent.click(screen.getByRole("button", { name: "Alejar la cámara" }));
    expect(zoom()).toBeCloseTo(ROOM_VIEW.zoomRange[1], 6);
    for (let i = 0; i < 12; i++) fireEvent.click(screen.getByRole("button", { name: "Acercar la cámara" }));
    expect(zoom()).toBeCloseTo(ROOM_VIEW.zoomRange[0], 6);
    expect(screen.getByRole("group", { name: "Cámara de la habitación" })).toBeTruthy();
  });

  it("leaves the admin preview without room controls or focus state", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(screen.queryByRole("group", { name: "Cámara de la habitación" })).toBeNull();
    expect(screen.getByRole("img").getAttribute("data-camera-focus")).toBeNull();
  });
});
