/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AdminDesign3DPage } from "@/app/admin/_components/design-3d/AdminDesign3DPage";
import { CAT_JOINT_IDS, CAT_POSES, CAT_POSE_IDS } from "@/features/pet-home/cat-pose-data";
import { PREVIEW_PET_NEEDS } from "@/features/pet-home/pet-stats";
import { DEFAULT_GREY_COAT } from "@/features/pet-home/extract-coat-colors";
import { defaultCatDesign } from "@/features/admin/cat-design-settings";
import { exportCatPose } from "@/features/admin/cat-pose-export";
import type { CatPoseEditorPreviewProps } from "@/app/admin/_components/design-3d/CatPoseEditor";
import type { CatDesignTunables } from "@/features/admin/cat-design-settings";

const viewer = vi.hoisted(() => ({ props: null as (CatPoseEditorPreviewProps & { design: CatDesignTunables }) | null }));
vi.mock("next/dynamic", () => ({ default: () => (props: NonNullable<typeof viewer.props>) => {
  viewer.props = props;
  return <div role="img" aria-label="Viewer compartido" />;
} }));
const props = () => viewer.props!;
const preview = () => props().posePreview!;
const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
function openEditor() {
  const details = screen.getByText("Poses y transiciones").closest("details")!;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  return details;
}
let writeText: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  localStorage.clear();
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("admin pose editor public UI", () => {
  it("preserves the single default preview and four initial model sliders behind progressive disclosure", () => {
    render(<AdminDesign3DPage />);
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getAllByRole("slider")).toHaveLength(4);
    expect(props().colors).toEqual(DEFAULT_GREY_COAT);
    expect(props().design).toEqual(defaultCatDesign());
    expect(props().needs).toEqual(PREVIEW_PET_NEEDS);
    expect(screen.getByText("Poses y transiciones").closest("details")!.open).toBe(false);
    const details = openEditor();
    expect(within(details).getAllByRole("slider").filter(input => input.id.startsWith("pose-joint-"))).toHaveLength(22);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("edits each local axis without dropping triplets, forwards selection/pivot and resets only the pose", () => {
    render(<AdminDesign3DPage />); openEditor();
    const original = JSON.stringify(CAT_POSES);
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const remove = vi.spyOn(Storage.prototype, "removeItem");
    for (const [axis, value] of [["X", "12"], ["Y", "23"], ["Z", "34"]]) {
      fireEvent.click(screen.getByRole("button", { name: `Eje ${axis}` }));
      change(`joint-tailMid · ${axis} (grados locales)`, value);
    }
    expect(preview().definition.rotationDeg["joint-tailMid"]).toEqual([12, 23, 34]);
    expect(preview().selectedJoint).toBe("joint-tailMid");
    expect(screen.getByText(/Pivote: joint-tailMid · marco local XYZ/)).toBeTruthy();
    expect(Object.keys(preview().definition.rotationDeg)).toEqual(CAT_JOINT_IDS);
    for (const id of CAT_JOINT_IDS) expect(preview().definition.rotationDeg[id]).toHaveLength(3);
    change("Altura raíz", "0.123"); change("Orientación sin envolver (grados)", "730");
    expect(preview().definition.rootOffset).toEqual([0, .123, 0]);
    expect(preview().definition.headingDeg).toBe(730);
    fireEvent.click(screen.getByRole("button", { name: "Volver a sentado" }));
    expect(preview().definition).toEqual(CAT_POSES.seated);
    expect(preview().pose).toBe("seated");
    expect(props().design).toEqual(defaultCatDesign());
    expect(storage).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled(); expect(writeText).not.toHaveBeenCalled();
    expect(JSON.stringify(CAT_POSES)).toBe(original);
  });

  it("selects all seven complete presets and forwards transition controls, never advancing them in a fake UI loop", () => {
    render(<AdminDesign3DPage />); openEditor();
    expect(within(screen.getByLabelText("Pose")).getAllByRole("option")).toHaveLength(7);
    for (const id of CAT_POSE_IDS) {
      change("Pose", id);
      expect(preview().pose).toBe(id);
      expect(preview().definition).toEqual(CAT_POSES[id]);
    }
    change("Desde", "side"); change("Hacia", "standing");
    change("Progreso de transición", "0.375");
    expect(preview().transition).toEqual({ from: "side", to: "standing", progress: .375, playing: false });
    fireEvent.click(screen.getByRole("button", { name: "Reproducir" }));
    expect(preview().transition?.playing).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(preview().transition?.playing).toBe(false);
    expect(preview().transition?.progress).toBe(.375);
  });

  it("keeps hunger, coats, motion and diagnostics local and forwards the frozen preview contract", () => {
    const view = render(<AdminDesign3DPage />); openEditor();
    const storage = vi.spyOn(Storage.prototype, "setItem");
    for (const hunger of ["0", "100"]) { change("Hambre de vista previa", hunger); expect(props().needs).toEqual({ ...PREVIEW_PET_NEEDS, hunger: Number(hunger) }); }
    for (const pattern of ["solid", "tabby", "tuxedo", "calico", "pointed"]) {
      change("Patrón de vista previa", pattern);
      expect(props().colors).toEqual({ ...DEFAULT_GREY_COAT, pattern });
    }
    for (const [label, key] of [["Respiración", "breathing"], ["Movimiento reducido", "reducedMotion"], ["Mostrar piezas ocultas", "showHidden"], ["Diagnósticos de contacto", "contacts"]] as const) {
      const before = preview()[key]; fireEvent.click(screen.getByLabelText(label)); expect(preview()[key]).toBe(!before);
    }
    expect(storage).not.toHaveBeenCalled(); expect(fetchMock).not.toHaveBeenCalled();
    expect(props().design).toEqual(defaultCatDesign());
    view.unmount(); render(<AdminDesign3DPage />); openEditor();
    expect(props().colors).toEqual(DEFAULT_GREY_COAT);
    expect(props().needs).toEqual(PREVIEW_PET_NEEDS);
    expect(preview().definition).toEqual(CAT_POSES.seated);
    expect(preview().reducedMotion).toBe(false);
  });

  it("honors the live system motion preference until an explicit local preview override", () => {
    let reduced = true;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      get matches() { return reduced; },
      addEventListener: (_event: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_event: string, listener: () => void) => listeners.delete(listener),
    })));
    const view = render(<AdminDesign3DPage />); openEditor();
    const storage = vi.spyOn(Storage.prototype, "setItem");
    expect(preview().reducedMotion).toBe(true);
    expect(screen.getByLabelText("Movimiento reducido")).toHaveProperty("checked", true);
    act(() => { reduced = false; listeners.forEach(listener => listener()); });
    expect(preview().reducedMotion).toBe(false);
    fireEvent.click(screen.getByLabelText("Movimiento reducido"));
    expect(preview().reducedMotion).toBe(true);
    act(() => { reduced = true; listeners.forEach(listener => listener()); });
    act(() => { reduced = false; listeners.forEach(listener => listener()); });
    expect(preview().reducedMotion).toBe(true);
    expect(storage).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    view.unmount();
    expect(listeners.size).toBe(0);
  });

  it("pauses at the observed shared-viewer progress rather than the stale last scrub value", () => {
    render(<AdminDesign3DPage />); openEditor();
    change("Desde", "seated"); change("Hacia", "curled");
    fireEvent.click(screen.getByRole("button", { name: "Reproducir" }));
    preview().diagnostics!.current = {
      tick: 90, transitionProgress: .7, plantedFeet: 0, unreachableFeet: 0,
      maxFootDrift: null, maxFootDriftPx: null, maxSeamGap: null, maxFloorPenetration: null, cpuMs: .4,
    };
    fireEvent.click(screen.getByRole("button", { name: "Pausar" }));
    expect(preview().transition).toEqual({ from: "seated", to: "curled", progress: .7, playing: false });
    expect(screen.getByLabelText("Progreso de transición")).toHaveProperty("value", "0.7");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies only on explicit click, exports current complete draft, and reports both clipboard outcomes", async () => {
    render(<AdminDesign3DPage />); openEditor();
    change("Pose", "curled"); change("Orientación sin envolver (grados)", "725");
    expect(writeText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Copiar pose TypeScript" }));
    await screen.findByText("Pose copiada");
    expect(writeText).toHaveBeenCalledExactlyOnceWith(exportCatPose(preview().definition));
    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Copiar pose TypeScript" }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "No se pudo copiar la pose. Probá de nuevo.");
    expect(screen.queryByText("Pose copiada")).toBeNull();
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports unmeasured contacts honestly and polls borrowed metrics outside the render loop with cleanup", async () => {
    const view = render(<AdminDesign3DPage />); openEditor();
    fireEvent.click(screen.getByLabelText("Diagnósticos de contacto"));
    expect(screen.getByText("Deriva: sin validar · Separación: sin validar · Piso: sin validar")).toBeTruthy();
    const borrowed = preview().diagnostics!;
    borrowed.current = { tick: 12, transitionProgress: .7, plantedFeet: 2, unreachableFeet: 1,
      maxFootDrift: .002, maxFootDriftPx: null, maxSeamGap: null, maxFloorPenetration: null, cpuMs: .4 };
    await waitFor(() => expect(screen.getByText(/Deriva: 0.002/)).toBeTruthy());
    expect(screen.getByText(/Separación: sin validar · Piso: sin validar/)).toBeTruthy();
    expect(screen.getByText(/Apoyos: 2 · Inalcanzables: 1/)).toBeTruthy();
    expect(screen.getByLabelText("Progreso de transición")).toHaveProperty("value", "0");
    expect(preview().diagnostics).toBe(borrowed);
    const clear = vi.spyOn(window, "clearInterval");
    view.unmount(); expect(clear).toHaveBeenCalled();
  });
});
