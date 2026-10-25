/** @vitest-environment jsdom */
import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Cat3DViewer } from "@/features/pet-home/components/Cat3DViewer";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import { PREVIEW_PET_NEEDS } from "@/features/pet-home/pet-stats";

const { procedural, canvas, controls } = vi.hoisted(() => ({
  procedural: vi.fn(), canvas: vi.fn(), controls: vi.fn(),
}));
vi.mock("@react-three/fiber", () => ({
  Canvas: ({ children, ...props }: { children: React.ReactNode }) => {
    canvas(props);
    return <div>{React.Children.toArray(children).filter((child) => React.isValidElement(child) && typeof child.type !== "string")}</div>;
  },
}));
vi.mock("@react-three/drei", () => ({
  ContactShadows: () => null,
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
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Cat3DViewer", () => {
  it("always selects procedural rendering even with an adversarial legacy asset input", () => {
    // Deliberately pass the retired prop through a spread to guard against restoring the branch.
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
    expect(canvas.mock.lastCall![0]).toMatchObject({ camera: { position: [0, 0.42, 3.05], fov: 28 }, dpr: [1, 1.75], gl: { antialias: true, alpha: true } });
    expect(controls.mock.lastCall![0]).toMatchObject({ enablePan: false, enableZoom: false, target: [0, 0.18, 0.05], rotateSpeed: 0.85, dampingFactor: 0.08, enableDamping: true });
  });
});
