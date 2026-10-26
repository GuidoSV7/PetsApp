/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Cat3DViewer } from "@/features/pet-home/components/Cat3DViewer";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
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
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode }) => {
    canvas(props);
    return <div>{React.Children.toArray(children).filter((child) => React.isValidElement(child) && typeof child.type !== "string")}</div>;
  },
}));
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
vi.mock("@/features/pet-home/components/Cat3DModel", () => ({
  Cat3DModel: (props: { onPetInteract?: () => void }) => {
    procedural(props);
    return <button onClick={props.onPetInteract}>Procedural cat</button>;
  },
}));
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

  it("uses fixed256 shadow resolution and preserves every other appearance prop", () => {
    render(<Cat3DViewer colors={DEFAULT_GREY_COAT} />);
    expect(shadow.mock.lastCall![0]).toEqual({ resolution: 256, position: [0, -0.62, 0], opacity: 0.28, scale: 3.4, blur: 2.6, far: 2.2, color: "#1c2b22" });
  });
});
